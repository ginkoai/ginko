/**
 * Ginko Background Service Worker
 * Handles extension lifecycle, tab monitoring, and core functionality
 */

class GinkoBackground {
    constructor() {
        this.claudeTabs = new Set();
        this.sessionData = new Map();
        this.compatibilityData = new Map();
        this.cspViolations = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('Ginko background service worker initialized');
    }

    setupEventListeners() {
        // Extension installation and startup
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        chrome.runtime.onStartup.addListener(() => {
            console.log('Ginko extension started');
            this.initializeExtension();
        });

        // Action button click (opens sidebar)
        chrome.action.onClicked.addListener((tab) => {
            this.handleActionClick(tab);
        });

        // Tab events for Claude.ai detection
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
            this.handleTabRemoved(tabId);
        });

        // Message handling from content scripts and sidebar
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Storage changes
        chrome.storage.onChanged.addListener((changes, areaName) => {
            this.handleStorageChange(changes, areaName);
        });
    }

    async handleInstallation(details) {
        console.log('Ginko installed:', details);

        if (details.reason === 'install') {
            // First time installation
            await this.setDefaultSettings();
            await this.showWelcomeNotification();
        } else if (details.reason === 'update') {
            // Extension updated
            const previousVersion = details.previousVersion;
            console.log(`Updated from version ${previousVersion}`);
        }

        // Initialize storage
        await this.initializeStorage();
    }

    async initializeExtension() {
        // Check for existing Claude.ai tabs
        const tabs = await chrome.tabs.query({ url: 'https://claude.ai/*' });
        
        tabs.forEach(tab => {
            this.claudeTabs.add(tab.id);
        });

        console.log(`Found ${tabs.length} existing Claude.ai tabs`);
    }

    async handleActionClick(tab) {
        console.log('Extension icon clicked');

        try {
            // Check if sidePanel API is available
            if (!chrome.sidePanel) {
                throw new Error('Side Panel API is not available');
            }

            // Validate tab exists and has valid ID
            if (!tab || !tab.id) {
                throw new Error('Invalid tab provided');
            }

            // Open side panel
            await chrome.sidePanel.open({ tabId: tab.id });
            
            // Track usage
            await this.trackUsage('sidebar_opened');
        } catch (error) {
            console.error('Error opening side panel:', {
                error: error.message,
                stack: error.stack,
                tabId: tab?.id,
                tabUrl: tab?.url,
                sidePanel: !!chrome.sidePanel
            });
            
            // Fallback: try to show notification with error handling
            try {
                if (chrome.notifications && chrome.notifications.create) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon-48.png',
                        title: 'Ginko',
                        message: `Side panel could not be opened: ${error.message}. Please try again.`
                    });
                } else {
                    console.warn('Side panel could not be opened and notifications are not available');
                }
            } catch (notificationError) {
                console.warn('Unable to show error notification:', notificationError);
            }
        }
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        if (!tab.url) return;

        // Check if this is a Claude.ai tab
        if (tab.url.includes('claude.ai')) {
            if (changeInfo.status === 'complete') {
                this.onClaudeTabReady(tabId, tab);
            }
        } else {
            // Remove from Claude tabs if URL changed away from Claude
            if (this.claudeTabs.has(tabId)) {
                this.claudeTabs.delete(tabId);
                this.onClaudeTabLost(tabId);
            }
        }
    }

    handleTabRemoved(tabId) {
        if (this.claudeTabs.has(tabId)) {
            this.claudeTabs.delete(tabId);
            this.onClaudeTabLost(tabId);
        }
    }

    async onClaudeTabReady(tabId, tab) {
        console.log('Claude.ai tab ready:', tabId);
        
        this.claudeTabs.add(tabId);
        
        try {
            // Validate tab and permissions
            if (!tabId || !tab) {
                throw new Error('Invalid tab or tabId provided');
            }

            // Check if we have the necessary permissions
            if (!chrome.scripting || !chrome.scripting.executeScript) {
                throw new Error('Scripting API is not available');
            }

            // Inject content script if needed
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });

            // Wait a moment for content script to initialize
            await new Promise(resolve => setTimeout(resolve, 100));

            // Send initialization message to content script (may fail if tab not ready)
            try {
                await chrome.tabs.sendMessage(tabId, {
                    action: 'init',
                    extensionId: chrome.runtime.id
                });
            } catch (msgError) {
                // This is normal if the content script isn't ready yet
                console.debug('Content script not ready yet, will retry on next update');
            }

            // Track Claude.ai tab activation
            await this.trackUsage('claude_tab_detected');

        } catch (error) {
            // Only log as debug since this is often expected (e.g., tab not ready yet)
            console.debug('Could not setup Claude.ai tab (this is often normal):', {
                error: error.message,
                tabId: tabId,
                tabUrl: tab?.url
            });
            
            // Track setup failures for debugging
            await this.trackUsage('claude_tab_setup_failed', {
                tabId: tabId,
                error: error.message,
                tabUrl: tab?.url
            }).catch(() => {
                // Ignore tracking errors during error handling
            });
        }
    }

    onClaudeTabLost(tabId) {
        console.log('Claude.ai tab lost:', tabId);
        
        // Clean up session data for this tab
        this.sessionData.delete(tabId);
        
        // Notify sidebar about tab loss
        this.notifyUIUpdate();
    }

    async handleMessage(message, sender, sendResponse) {
        console.log('Received message:', message.action, sender);

        try {
            switch (message.action) {
                case 'getClaudeTabs':
                    sendResponse({ claudeTabs: Array.from(this.claudeTabs) });
                    break;

                case 'captureContext':
                    await this.captureContext(message.data, sender.tab?.id);
                    sendResponse({ success: true });
                    break;

                case 'loadHandoff':
                    const handoffData = await this.loadHandoff(message.sessionId);
                    sendResponse({ success: true, data: handoffData });
                    break;

                case 'saveSession':
                    await this.saveSession(message.data, sender.tab?.id);
                    sendResponse({ success: true });
                    break;

                case 'getSettings':
                    const settings = await this.getSettings();
                    sendResponse({ settings });
                    break;

                case 'updateSetting':
                    await this.updateSetting(message.key, message.value);
                    sendResponse({ success: true });
                    break;

                case 'trackUsage':
                    await this.trackUsage(message.event, message.data);
                    sendResponse({ success: true });
                    break;
                    
                case 'contentScriptReady':
                    await this.handleContentScriptReady(message, sender);
                    sendResponse({ success: true });
                    break;
                    
                case 'claudeDetectionStatus':
                    this.handleClaudeDetectionStatus(message, sender);
                    sendResponse({ success: true });
                    break;
                    
                case 'compatibilityResults':
                    await this.handleCompatibilityResults(message, sender);
                    sendResponse({ success: true });
                    break;
                    
                case 'cspViolation':
                    this.handleCSPViolation(message, sender);
                    sendResponse({ success: true });
                    break;
                    
                case 'cspError':
                    this.handleCSPError(message, sender);
                    sendResponse({ success: true });
                    break;
                    
                case 'getCompatibilityData':
                    const compatibilityData = this.getCompatibilityData(sender.tab?.id);
                    sendResponse({ success: true, data: compatibilityData });
                    break;

                default:
                    console.warn('Unknown message action:', message.action);
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', {
                action: message.action,
                error: error.message,
                stack: error.stack,
                senderId: sender.id,
                senderTabId: sender.tab?.id,
                senderUrl: sender.tab?.url
            });
            sendResponse({ 
                success: false, 
                error: error.message,
                action: message.action 
            });
        }
    }

    handleStorageChange(changes, areaName) {
        console.log('Storage changed:', changes, areaName);
        
        // Notify UI components about relevant changes
        if (areaName === 'sync' && (changes.autoCapture || changes.notifications)) {
            this.notifyUIUpdate();
        }
    }

    // Core functionality methods
    async captureContext(contextData, tabId) {
        console.log('Capturing context for tab:', tabId);

        const sessionId = this.generateSessionId();
        const timestamp = new Date().toISOString();

        const sessionData = {
            id: sessionId,
            tabId: tabId,
            timestamp: timestamp,
            context: contextData,
            url: contextData?.url || 'unknown'
        };

        // Store session data
        await chrome.storage.local.set({
            [`session_${sessionId}`]: sessionData,
            'lastSession': sessionId
        });

        // Cache in memory
        this.sessionData.set(tabId, sessionData);

        // Track usage
        await this.trackUsage('context_captured', { sessionId });

        console.log('Context captured successfully:', sessionId);
        return sessionId;
    }

    async loadHandoff(sessionId = null) {
        console.log('Loading handoff:', sessionId);

        if (!sessionId) {
            // Load most recent session
            const result = await chrome.storage.local.get(['lastSession']);
            sessionId = result.lastSession;
        }

        if (!sessionId) {
            throw new Error('No session to load');
        }

        const result = await chrome.storage.local.get([`session_${sessionId}`]);
        const sessionData = result[`session_${sessionId}`];

        if (!sessionData) {
            throw new Error('Session not found');
        }

        // Track usage
        await this.trackUsage('handoff_loaded', { sessionId });

        return sessionData;
    }

    async saveSession(sessionData, tabId) {
        console.log('Saving session for tab:', tabId);

        const sessionId = sessionData.id || this.generateSessionId();
        const timestamp = new Date().toISOString();

        const fullSessionData = {
            ...sessionData,
            id: sessionId,
            tabId: tabId,
            timestamp: timestamp,
            lastSaved: timestamp
        };

        // Store session data
        await chrome.storage.local.set({
            [`session_${sessionId}`]: fullSessionData,
            'lastSession': sessionId
        });

        // Update memory cache
        this.sessionData.set(tabId, fullSessionData);

        return sessionId;
    }

    // Settings management
    async setDefaultSettings() {
        const defaultSettings = {
            autoCapture: true,
            notifications: true,
            theme: 'auto',
            maxSessions: 50
        };

        await chrome.storage.sync.set(defaultSettings);
        console.log('Default settings initialized');
    }

    async getSettings() {
        const result = await chrome.storage.sync.get([
            'autoCapture',
            'notifications', 
            'theme',
            'maxSessions'
        ]);
        
        return result;
    }

    async updateSetting(key, value) {
        await chrome.storage.sync.set({ [key]: value });
        console.log(`Setting ${key} updated to:`, value);
    }

    // Storage and utilities
    async initializeStorage() {
        // Clean up old sessions if needed
        const result = await chrome.storage.local.get(null);
        const sessionKeys = Object.keys(result).filter(key => key.startsWith('session_'));
        
        if (sessionKeys.length > 50) {
            // Remove oldest sessions
            const sessions = sessionKeys.map(key => ({
                key,
                data: result[key]
            })).sort((a, b) => new Date(a.data.timestamp) - new Date(b.data.timestamp));

            const toRemove = sessions.slice(0, sessionKeys.length - 50).map(s => s.key);
            await chrome.storage.local.remove(toRemove);
            
            console.log(`Cleaned up ${toRemove.length} old sessions`);
        }
    }

    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    async trackUsage(event, data = {}) {
        const usageData = {
            event,
            timestamp: new Date().toISOString(),
            ...data
        };

        // Store usage data locally (ToS compliant - no external transmission)
        const result = await chrome.storage.local.get(['usageStats']);
        const usageStats = result.usageStats || [];
        
        usageStats.push(usageData);
        
        // Keep only last 200 events (increased for debugging)
        if (usageStats.length > 200) {
            usageStats.splice(0, usageStats.length - 200);
        }

        await chrome.storage.local.set({ usageStats });
        console.log('Usage tracked:', event, data);
    }
    
    // Debug helper method
    getDebugInfo() {
        return {
            claudeTabs: Array.from(this.claudeTabs),
            sessionData: Object.fromEntries(this.sessionData),
            compatibilityData: Object.fromEntries(this.compatibilityData),
            cspViolations: this.cspViolations,
            timestamp: Date.now()
        };
    }

    async showWelcomeNotification() {
        try {
            // Check if notifications API is available
            if (chrome.notifications && chrome.notifications.create) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon-48.png',
                    title: 'Ginko Installed!',
                    message: 'Your Claude.ai companion is ready. Click the extension icon to get started.'
                });
            } else {
                // Fallback: log the welcome message
                console.log('Ginko Installed! Your Claude.ai companion is ready. Click the extension icon to get started.');
                
                // Store a welcome flag that can be shown in the UI later
                await chrome.storage.local.set({
                    'welcomeMessage': {
                        shown: false,
                        timestamp: Date.now(),
                        message: 'Ginko is now installed! Click the extension icon to get started.'
                    }
                });
            }
        } catch (error) {
            console.warn('Unable to show welcome notification:', error);
            
            // Fallback: store welcome message for UI display
            try {
                await chrome.storage.local.set({
                    'welcomeMessage': {
                        shown: false,
                        timestamp: Date.now(),
                        message: 'Ginko is now installed! Click the extension icon to get started.',
                        error: error.message
                    }
                });
            } catch (storageError) {
                console.error('Unable to store welcome message:', storageError);
            }
        }
    }

    notifyUIUpdate() {
        // Send message to all active sidebar instances
        chrome.runtime.sendMessage({
            action: 'uiUpdate',
            claudeTabs: Array.from(this.claudeTabs)
        }).catch((error) => {
            // Sidebar might not be open - this is expected behavior
            console.debug('UI update message not delivered (sidebar likely closed):', error.message);
        });
    }
    
    // New methods for handling enhanced content script communication
    async handleContentScriptReady(message, sender) {
        const tabId = sender.tab?.id;
        if (!tabId) return;
        
        console.log('Content script ready for tab:', tabId, message);
        
        // Store readiness status
        this.sessionData.set(tabId, {
            ...this.sessionData.get(tabId),
            contentScriptReady: true,
            hasClaudeInterface: message.hasClaudeInterface,
            lastUpdate: Date.now()
        });
        
        // Forward to sidebar
        chrome.runtime.sendMessage({
            action: 'contentScriptReady',
            tabId,
            hasClaudeInterface: message.hasClaudeInterface,
            compatibilityResults: message.compatibilityResults
        }).catch((error) => {
            console.debug('Content script ready message not delivered (sidebar likely closed):', error.message);
        });
        
        // Track readiness
        await this.trackUsage('content_script_ready', {
            tabId,
            hasInterface: message.hasClaudeInterface
        });
    }
    
    handleClaudeDetectionStatus(message, sender) {
        const tabId = sender.tab?.id;
        if (!tabId) return;
        
        console.log('Claude detection status update:', tabId, message.hasInterface);
        
        // Update tab data
        const tabData = this.sessionData.get(tabId) || {};
        tabData.hasClaudeInterface = message.hasInterface;
        tabData.elementsFound = message.elementsFound;
        tabData.lastDetectionUpdate = Date.now();
        this.sessionData.set(tabId, tabData);
        
        // Forward to sidebar for real-time updates
        chrome.runtime.sendMessage({
            action: 'claudeDetectionStatus',
            tabId,
            hasInterface: message.hasInterface,
            elementsFound: message.elementsFound,
            url: message.url
        }).catch((error) => {
            console.debug('Claude detection status message not delivered (sidebar likely closed):', error.message);
        });
    }
    
    async handleCompatibilityResults(message, sender) {
        const tabId = sender.tab?.id;
        if (!tabId) return;
        
        console.log('Compatibility results for tab:', tabId, message.results);
        
        // Store compatibility data
        this.compatibilityData.set(tabId, {
            ...message.results,
            tabId,
            url: sender.tab?.url,
            userAgent: sender.tab?.userAgent || 'unknown',
            receivedAt: Date.now()
        });
        
        // Forward to sidebar
        chrome.runtime.sendMessage({
            action: 'compatibilityResults',
            tabId,
            results: message.results
        }).catch((error) => {
            console.debug('Compatibility results message not delivered (sidebar likely closed):', error.message);
        });
        
        // Track compatibility status
        await this.trackUsage('compatibility_test', {
            tabId,
            claudeDetection: message.results.claudeDetection,
            domAccess: message.results.domAccess?.success,
            localStorage: message.results.localStorage?.success,
            clipboardAPI: message.results.clipboardAPI?.success
        });
    }
    
    handleCSPViolation(message, sender) {
        const tabId = sender.tab?.id;
        const violation = {
            ...message.violation,
            tabId,
            url: sender.tab?.url,
            receivedAt: Date.now()
        };
        
        console.warn('CSP Violation reported from tab:', tabId, violation);
        
        // Store violation (keep last 50)
        this.cspViolations.push(violation);
        if (this.cspViolations.length > 50) {
            this.cspViolations.splice(0, this.cspViolations.length - 50);
        }
        
        // Forward to sidebar
        chrome.runtime.sendMessage({
            action: 'cspViolation',
            tabId,
            violation: message.violation
        }).catch((error) => {
            console.debug('CSP violation message not delivered (sidebar likely closed):', error.message);
        });
        
        // Track CSP violations for debugging
        this.trackUsage('csp_violation', {
            tabId,
            violatedDirective: violation.violatedDirective,
            blockedURI: violation.blockedURI
        }).catch(() => {});
    }
    
    handleCSPError(message, sender) {
        const tabId = sender.tab?.id;
        console.warn('CSP Error from tab:', tabId, message.error);
        
        // Track CSP errors
        this.trackUsage('csp_error', {
            tabId,
            error: message.error
        }).catch(() => {});
    }
    
    getCompatibilityData(tabId) {
        if (!tabId) return null;
        
        return {
            compatibility: this.compatibilityData.get(tabId),
            sessionData: this.sessionData.get(tabId),
            cspViolations: this.cspViolations.filter(v => v.tabId === tabId)
        };
    }
}

// Initialize the background service
const ginkoBackground = new GinkoBackground();

// Export for debugging
if (typeof globalThis !== 'undefined') {
    globalThis.GinkoBackground = ginkoBackground;
    globalThis.GinkoDebug = {
        getDebugInfo: () => ginkoBackground.getDebugInfo(),
        getClaudeTabs: () => Array.from(ginkoBackground.claudeTabs),
        getCompatibilityData: (tabId) => ginkoBackground.getCompatibilityData(tabId),
        getCSPViolations: () => ginkoBackground.cspViolations
    };
}