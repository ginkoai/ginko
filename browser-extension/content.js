/**
 * Ginko Content Script for Claude.ai
 * Runs in the context of Claude.ai pages to capture context and enable interactions
 * CRITICAL: ToS Compliant - No automation, user-initiated actions only
 */

class GinkoContentScript {
    constructor() {
        this.isInitialized = false;
        this.sessionData = {
            id: null,
            startTime: Date.now(),
            messages: [],
            context: {}
        };
        
        this.init();
    }

    init() {
        console.log('Ginko content script initializing on:', window.location.href);
        
        // Set up CSP violation monitoring
        this.setupCSPMonitoring();
        
        // Wait for page to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    setupCSPMonitoring() {
        // Monitor for Content Security Policy violations
        document.addEventListener('securitypolicyviolation', (e) => {
            console.warn('CSP Violation detected:', {
                violatedDirective: e.violatedDirective,
                blockedURI: e.blockedURI,
                documentURI: e.documentURI,
                effectiveDirective: e.effectiveDirective,
                disposition: e.disposition,
                statusCode: e.statusCode
            });
            
            // Report CSP violation to background script
            chrome.runtime.sendMessage({
                action: 'cspViolation',
                violation: {
                    violatedDirective: e.violatedDirective,
                    blockedURI: e.blockedURI,
                    documentURI: e.documentURI,
                    effectiveDirective: e.effectiveDirective,
                    disposition: e.disposition,
                    timestamp: Date.now()
                }
            }).catch(err => console.log('Could not report CSP violation:', err.message));
        });
        
        // Monitor console errors that might indicate CSP issues
        const originalError = console.error;
        console.error = (...args) => {
            const message = args.join(' ');
            if (message.includes('Content Security Policy') || 
                message.includes('CSP') ||
                message.includes('refused to execute') ||
                message.includes('refused to load')) {
                
                chrome.runtime.sendMessage({
                    action: 'cspError',
                    error: message,
                    timestamp: Date.now()
                }).catch(() => {});
            }
            originalError.apply(console, args);
        };
    }

    initialize() {
        this.setupMessageListener();
        
        // Start robust detection with retry mechanism
        this.startClaudeDetection();
        
        this.runCompatibilityTests();
        this.isInitialized = true;
        
        console.log('Ginko content script initialized');
    }

    async startClaudeDetection() {
        console.log('Starting robust Claude.ai detection...');
        
        // Initial detection attempt
        let hasClaudeInterface = this.detectClaudeInterface();
        
        if (!hasClaudeInterface) {
            console.log('Initial detection failed, starting retry mechanism...');
            hasClaudeInterface = await this.retryDetectionWithDelay();
        }
        
        // Set up continuous monitoring for late-loading elements
        this.setupDetectionObserver();
        
        // Set up page observer after detection
        this.setupPageObserver();
        
        // Notify background script with final status
        this.notifyInitializationComplete(hasClaudeInterface);
    }

    async retryDetectionWithDelay() {
        const maxRetries = 10;
        const delayMs = 500;
        let hasClaudeInterface = false;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`Detection retry attempt ${attempt}/${maxRetries}...`);
            
            // Wait for dynamic content to load
            await this.waitForDelay(delayMs * attempt);
            
            hasClaudeInterface = this.detectClaudeInterface();
            
            if (hasClaudeInterface) {
                console.log(`✓ Detection succeeded on attempt ${attempt}`);
                break;
            }
            
            // Check if page is still loading
            if (document.readyState !== 'complete') {
                console.log('Page still loading, waiting for completion...');
                await this.waitForPageLoad();
            }
        }
        
        if (!hasClaudeInterface) {
            console.warn('Detection failed after all retries. Setting up mutation observer for late elements...');
        }
        
        return hasClaudeInterface;
    }

    waitForDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    waitForPageLoad() {
        return new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve, { once: true });
                // Fallback timeout
                setTimeout(resolve, 2000);
            }
        });
    }

    setupDetectionObserver() {
        // Set up mutation observer specifically for detecting Claude elements that load late
        this.detectionObserver = new MutationObserver((mutations) => {
            let shouldRecheck = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any added nodes might be Claude interface elements
                    const addedElements = Array.from(mutation.addedNodes).filter(node => 
                        node.nodeType === Node.ELEMENT_NODE
                    );
                    
                    if (addedElements.length > 0) {
                        // Check for potential Claude elements in added nodes
                        const hasClaudeIndicators = addedElements.some(element => {
                            try {
                                // Skip if not a proper element
                                if (!element || !element.nodeName) {
                                    return false;
                                }
                                
                                const text = element.textContent?.toLowerCase() || '';
                                // Use classList or className safely
                                const className = (typeof element.className === 'string' ? element.className : element.className?.baseVal || '').toLowerCase();
                                const testId = element.getAttribute ? element.getAttribute('data-testid') || '' : '';
                            
                                return text.includes('claude') || 
                                       className.includes('chat') || 
                                       className.includes('conversation') ||
                                       className.includes('message') ||
                                       testId.includes('chat') ||
                                       testId.includes('conversation') ||
                                       testId.includes('message') ||
                                       (element.querySelector && (
                                           element.querySelector('[data-testid*="chat"]') ||
                                           element.querySelector('[data-testid*="conversation"]') ||
                                           element.querySelector('[data-testid*="message"]') ||
                                           element.querySelector('textarea') ||
                                           element.querySelector('[contenteditable]')
                                       ));
                            } catch (e) {
                                // Silently ignore elements that cause errors
                                return false;
                            }
                        });
                        
                        if (hasClaudeIndicators) {
                            shouldRecheck = true;
                        }
                    }
                }
            });
            
            if (shouldRecheck && Object.keys(this.claudeElements).length === 0) {
                console.log('New potential Claude elements detected, rechecking...');
                setTimeout(() => {
                    const hasClaudeInterface = this.detectClaudeInterface();
                    if (hasClaudeInterface) {
                        console.log('✓ Late detection successful!');
                        this.notifyClaudeDetectionStatus(true);
                        this.detectionObserver.disconnect(); // Stop observing once we find elements
                    }
                }, 100);
            }
        });

        // Observe the entire document for changes
        this.detectionObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Stop observing after 30 seconds to prevent resource drain
        setTimeout(() => {
            if (this.detectionObserver) {
                this.detectionObserver.disconnect();
                console.log('Detection observer stopped after timeout');
            }
        }, 30000);
    }

    notifyInitializationComplete(hasClaudeInterface) {
        // Notify background script with detailed status
        chrome.runtime.sendMessage({
            action: 'contentScriptReady',
            url: window.location.href,
            hasClaudeInterface,
            compatibilityResults: this.compatibilityResults,
            elementsFound: Object.keys(this.claudeElements),
            detectionMethod: hasClaudeInterface ? 'success' : 'failed'
        }).catch(error => {
            console.log('Background script not ready:', error.message);
        });
    }
    
    runCompatibilityTests() {
        console.log('Running Claude.ai compatibility tests...');
        
        this.compatibilityResults = {
            claudeDetection: Object.keys(this.claudeElements).length > 0,
            domAccess: this.testDOMAccess(),
            localStorage: this.testLocalStorage(),
            sessionStorage: this.testSessionStorage(),
            clipboardAPI: this.testClipboardAPI(),
            messageObserver: this.testMessageObserver(),
            timestamp: Date.now()
        };
        
        console.log('Compatibility test results:', this.compatibilityResults);
        
        // Send results to background for reporting
        chrome.runtime.sendMessage({
            action: 'compatibilityResults',
            results: this.compatibilityResults
        }).catch(() => {});
    }
    
    testDOMAccess() {
        try {
            // Test basic DOM access
            const testElement = document.createElement('div');
            testElement.style.display = 'none';
            document.body.appendChild(testElement);
            document.body.removeChild(testElement);
            
            // Test conversation content access
            const messages = document.querySelectorAll('[data-testid="message"], .message, [role="listitem"]');
            const canReadMessages = messages.length >= 0; // Even 0 is valid
            
            return {
                success: true,
                canCreateElements: true,
                canReadMessages: canReadMessages,
                messageCount: messages.length
            };
        } catch (error) {
            console.warn('DOM access test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    testLocalStorage() {
        try {
            const testKey = 'ginko_test_' + Date.now();
            const testValue = 'test_value';
            
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            return {
                success: true,
                canWrite: retrieved === testValue,
                canRead: true
            };
        } catch (error) {
            console.warn('localStorage test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    testSessionStorage() {
        try {
            const testKey = 'ginko_session_test_' + Date.now();
            const testValue = 'session_test_value';
            
            sessionStorage.setItem(testKey, testValue);
            const retrieved = sessionStorage.getItem(testKey);
            sessionStorage.removeItem(testKey);
            
            return {
                success: true,
                canWrite: retrieved === testValue,
                canRead: true
            };
        } catch (error) {
            console.warn('sessionStorage test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async testClipboardAPI() {
        try {
            // Test clipboard write capability
            const testText = 'Ginko clipboard test ' + Date.now();
            await navigator.clipboard.writeText(testText);
            
            // Note: Can't reliably test read without user gesture
            return {
                success: true,
                canWrite: true,
                canRead: 'unknown' // Requires user gesture
            };
        } catch (error) {
            console.warn('Clipboard API test failed:', error);
            
            // Try fallback method
            try {
                const textArea = document.createElement('textarea');
                textArea.value = 'fallback test';
                document.body.appendChild(textArea);
                textArea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                return {
                    success: success,
                    canWrite: success,
                    method: 'execCommand',
                    fallback: true
                };
            } catch (fallbackError) {
                return {
                    success: false,
                    error: error.message,
                    fallbackError: fallbackError.message
                };
            }
        }
    }
    
    testMessageObserver() {
        try {
            // Test if we can observe DOM changes
            let observerWorks = false;
            const testElement = document.createElement('div');
            testElement.style.display = 'none';
            
            const observer = new MutationObserver(() => {
                observerWorks = true;
            });
            
            document.body.appendChild(testElement);
            observer.observe(document.body, { childList: true });
            
            // Trigger a change
            const childElement = document.createElement('span');
            testElement.appendChild(childElement);
            
            // Clean up
            setTimeout(() => {
                observer.disconnect();
                if (testElement.parentNode) {
                    testElement.parentNode.removeChild(testElement);
                }
            }, 100);
            
            return {
                success: true,
                observerSupported: typeof MutationObserver !== 'undefined',
                canObserveChanges: true
            };
        } catch (error) {
            console.warn('Message observer test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Content script received message:', message.action);
            
            switch (message.action) {
                case 'init':
                    this.handleInitMessage(message);
                    sendResponse({ success: true });
                    break;
                    
                case 'captureContext':
                    this.captureContext().then(context => {
                        sendResponse({ success: true, context });
                    }).catch(error => {
                        sendResponse({ success: false, error: error.message });
                    });
                    return true; // Keep message channel open
                    
                case 'loadHandoff':
                    this.loadHandoff(message.data).then(result => {
                        sendResponse({ success: true, result });
                    }).catch(error => {
                        sendResponse({ success: false, error: error.message });
                    });
                    return true; // Keep message channel open
                    
                case 'getPageInfo':
                    sendResponse({
                        success: true,
                        info: this.getPageInfo()
                    });
                    break;
                    
                case 'runCompatibilityTests':
                    this.runCompatibilityTests();
                    sendResponse({
                        success: true,
                        results: this.compatibilityResults
                    });
                    break;
                    
                case 'getClaudeElements':
                    sendResponse({
                        success: true,
                        elements: Object.keys(this.claudeElements),
                        hasInterface: Object.keys(this.claudeElements).length > 0
                    });
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        });
    }

    handleInitMessage(message) {
        console.log('Content script initialized by background script');
        this.sessionData.id = this.generateSessionId();
    }

    detectClaudeInterface() {
        // Enhanced Claude.ai interface detection (ToS compliant - read-only)
        console.log('Detecting Claude.ai interface on:', window.location.href);
        
        // Check if we're actually on Claude.ai domain
        if (!this.isOnClaudeAI()) {
            console.warn('Not on Claude.ai domain');
            return false;
        }
        
        // Clear previous results
        this.claudeElements = {};
        
        // Multiple detection strategies - try each one
        const strategies = [
            'detectPrimaryElements',
            'detectFallbackElements', 
            'detectGenericChatElements',
            'detectByClaudeText',
            'detectByURLPatterns'
        ];
        
        for (const strategy of strategies) {
            try {
                this[strategy]();
                if (Object.keys(this.claudeElements).length > 0) {
                    console.log(`✓ Detection successful using strategy: ${strategy}`);
                    break;
                }
            } catch (error) {
                console.warn(`Strategy ${strategy} failed:`, error);
            }
        }
        
        const hasClaudeInterface = Object.keys(this.claudeElements).length > 0;
        const elementsFound = Object.keys(this.claudeElements);
        
        console.log(`Claude interface detection result: ${hasClaudeInterface ? 'SUCCESS' : 'FAILED'} (${elementsFound.length} elements found)`);
        if (hasClaudeInterface) {
            console.log('Found elements:', elementsFound);
        }
        
        // Notify sidebar about Claude.ai detection status
        this.notifyClaudeDetectionStatus(hasClaudeInterface);
        
        return hasClaudeInterface;
    }

    detectPrimaryElements() {
        const selectors = {
            // Current Claude interface selectors (as of 2024)
            chatContainer: '[data-testid="conversation"]',
            messageInput: '[data-testid="chat-input"]', 
            messages: '[data-testid="message"]',
            sendButton: '[data-testid="send-button"]',
            conversationArea: '[data-testid="conversation-area"]',
            chatInput: 'textarea[placeholder*="Claude"]',
            messageList: '[role="log"]',
            chatHistory: '[data-testid="chat-history"]',
            
            // Additional common selectors
            promptTextarea: 'textarea[data-testid*="prompt"]',
            chatForm: 'form[data-testid*="chat"]'
        };

        for (const [key, selector] of Object.entries(selectors)) {
            try {
                const element = document.querySelector(selector);
                if (element && this.validateClaudeElement(element, key)) {
                    this.claudeElements[key] = element;
                    console.log(`✓ Found primary element: ${key} (${selector})`);
                }
            } catch (error) {
                console.warn(`Error querying primary selector ${key}:`, error);
            }
        }
    }

    detectGenericChatElements() {
        // Look for generic chat interface elements that could be Claude
        const genericSelectors = [
            // Text areas that might be chat inputs
            'textarea[placeholder*="message" i]',
            'textarea[placeholder*="ask" i]', 
            'textarea[placeholder*="tell" i]',
            'textarea[placeholder*="question" i]',
            'textarea[aria-label*="message" i]',
            
            // Content editable elements
            '[contenteditable="true"][role="textbox"]',
            '[contenteditable="true"][aria-label*="message" i]',
            
            // Main content areas
            'main[role="main"]',
            '[role="main"] textarea',
            
            // Chat-like containers
            '[class*="chat" i] textarea',
            '[class*="conversation" i] textarea',
            '[id*="chat" i] textarea',
            
            // Message containers
            '[role="log"]',
            '[class*="message" i]',
            '[data-role*="message" i]'
        ];

        for (const selector of genericSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach((element, index) => {
                    if (this.validateClaudeElement(element, 'generic')) {
                        const key = `generic_${selector.replace(/[^a-zA-Z0-9]/g, '_')}_${index}`;
                        this.claudeElements[key] = element;
                        console.log(`✓ Found generic element: ${key}`);
                    }
                });
            } catch (error) {
                console.warn(`Error with generic selector ${selector}:`, error);
            }
        }
    }

    detectByClaudeText() {
        // Look for elements containing Claude-specific text
        const claudeTexts = [
            'Claude', 'claude.ai', 'Anthropic',
            'Ask Claude', 'Chat with Claude',
            'Send message', 'Type a message'
        ];

        const allElements = document.querySelectorAll('*');
        
        for (const element of allElements) {
            const text = element.textContent?.toLowerCase() || '';
            const placeholder = element.getAttribute('placeholder')?.toLowerCase() || '';
            const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
            
            const hasClaudeText = claudeTexts.some(claudeText => 
                text.includes(claudeText.toLowerCase()) ||
                placeholder.includes(claudeText.toLowerCase()) ||
                ariaLabel.includes(claudeText.toLowerCase())
            );
            
            if (hasClaudeText && (
                element.tagName === 'TEXTAREA' ||
                element.tagName === 'INPUT' ||
                element.tagName === 'BUTTON' ||
                element.hasAttribute('contenteditable') ||
                element.getAttribute('role') === 'textbox' ||
                text.includes('message') ||
                element.querySelector && (
                    element.querySelector('textarea') ||
                    element.querySelector('[contenteditable]')
                )
            )) {
                const key = `claude_text_${element.tagName.toLowerCase()}_${Date.now()}`;
                this.claudeElements[key] = element;
                
                // Find which Claude text matched for logging
                const matchedText = claudeTexts.find(claudeText => 
                    text.includes(claudeText.toLowerCase()) ||
                    placeholder.includes(claudeText.toLowerCase()) ||
                    ariaLabel.includes(claudeText.toLowerCase())
                ) || 'unknown';
                
                console.log(`✓ Found Claude text element: ${key} (${matchedText})`);
                
                // Only find a few to avoid noise
                if (Object.keys(this.claudeElements).length >= 3) break;
            }
        }
    }

    detectByURLPatterns() {
        // Detect based on URL patterns and look for corresponding elements
        const url = window.location.href.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();
        
        // If URL indicates we're in a chat, look for any interactive elements
        if (pathname.includes('/chat') || 
            pathname.includes('/conversation') ||
            url.includes('claude.ai/chat') ||
            url.includes('claude.ai/new')) {
            
            // Look for any textarea or input that could be the chat interface
            const interactiveElements = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
            
            interactiveElements.forEach((element, index) => {
                // If we're on a chat URL and find interactive elements, assume they're Claude elements
                if (element.offsetParent && // visible
                    (element.offsetHeight > 30 || element.offsetWidth > 100)) { // reasonable size
                    const key = `url_pattern_${element.tagName.toLowerCase()}_${index}`;
                    this.claudeElements[key] = element;
                    console.log(`✓ Found URL pattern element: ${key}`);
                }
            });
        }
    }
    
    isOnClaudeAI() {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        
        // Check for various Claude.ai URLs
        const claudeDomains = [
            'claude.ai',
            'www.claude.ai',
            'app.claude.ai'
        ];
        
        const isClaudeDomain = claudeDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
        
        // Additional validation - check for Claude-specific page elements or metadata
        const hasClaudeMetadata = document.querySelector('meta[property="og:site_name"][content*="Claude"]') ||
                                  document.querySelector('title')?.textContent?.includes('Claude') ||
                                  document.querySelector('link[rel="icon"][href*="claude"]');
        
        return isClaudeDomain || hasClaudeMetadata;
    }
    
    detectFallbackElements() {
        // Enhanced fallback detection with broader selectors
        const fallbackStrategies = [
            {
                name: 'chatContainer',
                selectors: [
                    '[role="main"]',
                    '.conversation',
                    '#chat-container',
                    '[class*="conversation"]',
                    '[class*="chat"]',
                    'main[class*="chat"]',
                    '[data-component="conversation"]'
                ]
            },
            {
                name: 'messageInput',
                selectors: [
                    'textarea[placeholder*="message"]',
                    'textarea[placeholder*="Claude"]',
                    'textarea[placeholder*="Ask"]',
                    'textarea',
                    '[contenteditable="true"]',
                    'input[type="text"][placeholder*="message"]'
                ]
            },
            {
                name: 'messages',
                selectors: [
                    '[class*="message"]',
                    '[data-role="message"]',
                    '.chat-message',
                    '[role="listitem"]',
                    '[class*="conversation-turn"]'
                ]
            }
        ];
        
        fallbackStrategies.forEach(strategy => {
            if (!this.claudeElements[strategy.name]) {
                for (const selector of strategy.selectors) {
                    try {
                        const element = document.querySelector(selector);
                        if (element && this.validateClaudeElement(element, strategy.name)) {
                            this.claudeElements[strategy.name] = element;
                            console.log(`✓ Found fallback ${strategy.name}: ${selector}`);
                            break;
                        }
                    } catch (error) {
                        console.warn(`Error with fallback selector ${selector}:`, error);
                    }
                }
            }
        });
    }
    
    validateClaudeElement(element, elementType) {
        // Enhanced validation - be more permissive but still filter out irrelevant elements
        if (!element) return false;
        
        // Don't require visibility for initial detection - element might not be visible yet
        // if (!element.offsetParent) return false;
        
        const text = element.textContent?.toLowerCase() || '';
        // Handle className safely for different element types
        const className = (typeof element.className === 'string' ? element.className : element.className?.baseVal || '').toLowerCase();
        const id = element.id?.toLowerCase() || '';
        const placeholder = element.getAttribute('placeholder')?.toLowerCase() || '';
        const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
        const dataTestId = element.getAttribute('data-testid')?.toLowerCase() || '';
        
        // Positive indicators - things that suggest this is a Claude interface element
        const positivePatterns = [
            'claude', 'conversation', 'chat', 'message', 'ai', 'assistant',
            'prompt', 'input', 'send', 'anthropic', 'textarea', 'textbox'
        ];
        
        // Negative indicators - things that suggest this is NOT a Claude interface element
        const negativePatterns = [
            'advertisement', 'ad-', 'cookie', 'banner', 'popup', 'modal',
            'navigation', 'menu', 'footer', 'header', 'sidebar', 'search'
        ];
        
        const allText = [text, className, id, placeholder, ariaLabel, dataTestId].join(' ');
        
        // Check for negative patterns first - exclude obvious non-chat elements
        const hasNegativePattern = negativePatterns.some(pattern => 
            allText.includes(pattern)
        );
        
        if (hasNegativePattern) {
            return false;
        }
        
        // Check for positive patterns
        const hasPositivePattern = positivePatterns.some(pattern => 
            allText.includes(pattern)
        );
        
        // For specific element types, we can be more permissive
        if (elementType === 'generic' || elementType.includes('url_pattern')) {
            // For generic detection, just make sure it's not obviously irrelevant
            return !hasNegativePattern && (
                hasPositivePattern ||
                element.tagName === 'TEXTAREA' ||
                element.hasAttribute('contenteditable') ||
                element.getAttribute('role') === 'textbox'
            );
        }
        
        // For primary elements, we expect some positive indicators
        if (elementType && (elementType.includes('claude_text') || elementType.includes('primary'))) {
            return hasPositivePattern;
        }
        
        // Default case - require positive pattern or be a text input element
        return hasPositivePattern || 
               element.tagName === 'TEXTAREA' || 
               element.tagName === 'INPUT' ||
               element.hasAttribute('contenteditable');
    }
    
    notifyClaudeDetectionStatus(hasInterface) {
        // Send detection status to sidebar for real-time updates
        try {
            chrome.runtime.sendMessage({
                action: 'claudeDetectionStatus',
                hasInterface,
                url: window.location.href,
                elementsFound: Object.keys(this.claudeElements).length,
                timestamp: Date.now()
            }).catch(error => {
                console.log('Could not notify detection status:', error.message);
            });
        } catch (error) {
            console.warn('Error sending detection status:', error);
        }
    }

    setupPageObserver() {
        // Monitor page changes (ToS compliant - observation only)
        const observer = new MutationObserver((mutations) => {
            let messagesChanged = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    // Check if new messages were added
                    const addedNodes = Array.from(mutation.addedNodes);
                    if (addedNodes.some(node => 
                        node.nodeType === Node.ELEMENT_NODE && 
                        (node.matches('[data-testid="message"]') || 
                         node.querySelector && node.querySelector('[data-testid="message"]'))
                    )) {
                        messagesChanged = true;
                    }
                }
            });
            
            if (messagesChanged) {
                this.onMessagesChanged();
            }
        });

        // Start observing
        const targetNode = this.claudeElements.chatContainer || document.body;
        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });

        this.pageObserver = observer;
    }

    onMessagesChanged() {
        console.log('Messages changed in conversation');
        
        // Update session data (ToS compliant - read-only capture)
        this.updateSessionMessages();
        
        // Auto-capture if enabled
        this.checkAutoCapture();
    }

    async updateSessionMessages() {
        try {
            const messages = this.extractMessages();
            this.sessionData.messages = messages;
            this.sessionData.lastUpdate = Date.now();
        } catch (error) {
            console.error('Error updating session messages:', error);
        }
    }

    extractMessages() {
        // Extract messages from the conversation (ToS compliant - read-only)
        const messages = [];
        const messageElements = document.querySelectorAll('[data-testid="message"], .message, [role="listitem"]');
        
        messageElements.forEach((element, index) => {
            try {
                const messageData = this.parseMessageElement(element);
                if (messageData) {
                    messages.push({
                        ...messageData,
                        index,
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.error('Error parsing message element:', error);
            }
        });

        return messages;
    }

    parseMessageElement(element) {
        // Parse individual message elements (ToS compliant - read-only)
        const textContent = element.textContent?.trim();
        if (!textContent) return null;

        // Determine if message is from user or Claude
        const isUserMessage = element.querySelector('[data-testid="user-message"]') ||
                             element.closest('[data-testid="user-message"]') ||
                             element.classList.contains('user-message') ||
                             textContent.length < 1000; // Simple heuristic

        return {
            content: textContent,
            role: isUserMessage ? 'user' : 'assistant',
            html: element.innerHTML,
            timestamp: Date.now()
        };
    }

    async checkAutoCapture() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getSettings'
            });
            
            if (response.settings?.autoCapture) {
                await this.captureContext();
            }
        } catch (error) {
            console.error('Error checking auto-capture:', error);
        }
    }

    async captureContext() {
        console.log('Capturing context from Claude.ai page');
        
        try {
            const context = {
                url: window.location.href,
                title: document.title,
                timestamp: new Date().toISOString(),
                session: {
                    id: this.sessionData.id,
                    startTime: this.sessionData.startTime,
                    messages: this.extractMessages(),
                    messageCount: this.sessionData.messages.length
                },
                page: {
                    scrollPosition: window.scrollY,
                    viewportSize: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                },
                claude: {
                    interfaceVersion: this.detectClaudeVersion(),
                    hasActiveConversation: this.hasActiveConversation()
                }
            };

            // Send context to background script for storage
            const response = await chrome.runtime.sendMessage({
                action: 'saveSession',
                data: context
            });

            console.log('Context captured successfully:', response);
            return context;
            
        } catch (error) {
            console.error('Error capturing context:', error);
            throw error;
        }
    }

    async loadHandoff(handoffData) {
        console.log('Loading handoff data');
        
        // ToS Compliant: This would only prepare data for user to manually paste/use
        // No automatic interaction with Claude.ai interface
        
        try {
            if (!handoffData) {
                // Load most recent session
                const response = await chrome.runtime.sendMessage({
                    action: 'loadHandoff'
                });
                handoffData = response.data;
            }

            // Prepare handoff content for user (ToS compliant - no automation)
            const handoffContent = this.formatHandoffForUser(handoffData);
            
            // Copy to clipboard for user to manually paste
            await navigator.clipboard.writeText(handoffContent);
            
            // Show user notification about clipboard
            this.showUserNotification(
                'Handoff ready!', 
                'Session context has been copied to your clipboard. Paste it into Claude to continue your session.'
            );

            return { success: true, handoffContent };
            
        } catch (error) {
            console.error('Error loading handoff:', error);
            throw error;
        }
    }

    formatHandoffForUser(sessionData) {
        // Format session data into user-friendly handoff text
        const { session, page, timestamp } = sessionData;
        
        let handoffText = `# Ginko Session Handoff\n\n`;
        handoffText += `**Session:** ${session.id}\n`;
        handoffText += `**Timestamp:** ${timestamp}\n`;
        handoffText += `**Messages:** ${session.messageCount || session.messages?.length || 0}\n\n`;
        
        if (session.messages && session.messages.length > 0) {
            handoffText += `## Recent Context\n\n`;
            
            // Include last few messages for context
            const recentMessages = session.messages.slice(-3);
            recentMessages.forEach(msg => {
                handoffText += `**${msg.role === 'user' ? 'You' : 'Claude'}:** ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}\n\n`;
            });
        }
        
        handoffText += `---\n`;
        handoffText += `*This handoff was generated by Ginko. Paste this context into Claude to resume your session.*`;
        
        return handoffText;
    }

    getPageInfo() {
        return {
            url: window.location.href,
            title: document.title,
            hasClaudeInterface: Object.keys(this.claudeElements).length > 0,
            hasActiveConversation: this.hasActiveConversation(),
            messageCount: this.extractMessages().length
        };
    }

    hasActiveConversation() {
        const messages = document.querySelectorAll('[data-testid="message"], .message');
        return messages.length > 0;
    }

    detectClaudeVersion() {
        // Detect Claude interface version (ToS compliant - read-only)
        const metaTag = document.querySelector('meta[name="application-name"]');
        if (metaTag?.content?.includes('Claude')) {
            return metaTag.content;
        }
        
        // Fallback detection
        return 'Unknown';
    }

    showUserNotification(title, message) {
        // Create an in-page notification for the user
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            max-width: 300px;
            animation: ginkoSlideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
            <div style="opacity: 0.9; font-size: 13px;">${message}</div>
        `;
        
        // Add animation styles if not present
        if (!document.querySelector('#ginko-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'ginko-notification-styles';
            style.textContent = `
                @keyframes ginkoSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes ginkoSlideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'ginkoSlideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Cleanup when page unloads
    cleanup() {
        if (this.pageObserver) {
            this.pageObserver.disconnect();
        }
        if (this.detectionObserver) {
            this.detectionObserver.disconnect();
        }
    }
}

// Initialize content script
const ginkoContent = new GinkoContentScript();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    ginkoContent.cleanup();
});