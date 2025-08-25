#!/usr/bin/env python3
"""
Analyze OTLP telemetry data to detect development patterns
and generate coaching messages for statusline
"""

import json
import os
from datetime import datetime, timedelta
from collections import defaultdict, deque
from typing import Dict, List, Optional

class TelemetryAnalyzer:
    def __init__(self):
        self.telemetry_log = os.path.expanduser("~/.watchhill/otel-telemetry.jsonl")
        self.status_file = os.path.expanduser("~/.watchhill/statusline-coaching.json")
        
        # Pattern detection windows
        self.error_window = deque(maxlen=10)  # Last 10 tool executions
        self.activity_window = deque(maxlen=20)  # Last 20 events
        self.token_usage = deque(maxlen=5)  # Last 5 token measurements
        
    def load_recent_telemetry(self, minutes: int = 5) -> List[Dict]:
        """Load telemetry from the last N minutes"""
        if not os.path.exists(self.telemetry_log):
            return []
        
        cutoff = datetime.now() - timedelta(minutes=minutes)
        recent = []
        
        with open(self.telemetry_log, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    timestamp = datetime.fromisoformat(entry['timestamp'])
                    if timestamp > cutoff:
                        recent.append(entry)
                except:
                    continue
        
        return recent
    
    def detect_patterns(self, telemetry: List[Dict]) -> Dict:
        """Analyze telemetry to detect development patterns"""
        patterns = {
            "error_thrashing": False,
            "flow_state": False,
            "stuck": False,
            "context_pressure": False,
            "exploring": False,
            "debugging": False
        }
        
        # Extract metrics from telemetry
        tool_errors = 0
        tool_successes = 0
        unique_tools = set()
        total_events = len(telemetry)
        
        for entry in telemetry:
            if entry['type'] == 'traces':
                # Look for tool executions in traces
                data = entry.get('data', {})
                for rs in data.get('resourceSpans', []):
                    for ss in rs.get('scopeSpans', []):
                        for span in ss.get('spans', []):
                            name = span.get('name', '')
                            status = span.get('status', {})
                            
                            if 'tool' in name.lower():
                                unique_tools.add(name)
                                if status.get('code') == 2:  # ERROR
                                    tool_errors += 1
                                else:
                                    tool_successes += 1
            
            elif entry['type'] == 'metrics':
                # Look for token usage metrics
                data = entry.get('data', {})
                for rm in data.get('resourceMetrics', []):
                    for sm in rm.get('scopeMetrics', []):
                        for metric in sm.get('metrics', []):
                            if 'token' in metric.get('name', '').lower():
                                # Extract token count if available
                                pass
        
        # Pattern detection logic
        error_rate = tool_errors / max(tool_errors + tool_successes, 1)
        
        # Error thrashing: >40% error rate
        if error_rate > 0.4 and tool_errors >= 3:
            patterns["error_thrashing"] = True
        
        # Flow state: High success rate with diverse tools
        if tool_successes >= 5 and len(unique_tools) >= 3 and error_rate < 0.1:
            patterns["flow_state"] = True
        
        # Stuck: Low activity or repetitive tool use
        if total_events < 5 or (len(unique_tools) == 1 and total_events > 3):
            patterns["stuck"] = True
        
        # Exploring: Many different tools being used
        if len(unique_tools) >= 5:
            patterns["exploring"] = True
        
        # Debugging: Mix of errors and successes
        if tool_errors >= 2 and tool_successes >= 2:
            patterns["debugging"] = True
        
        return patterns
    
    def generate_coaching(self, patterns: Dict) -> str:
        """Generate coaching message based on detected patterns"""
        
        # Priority order for messages
        if patterns["error_thrashing"]:
            return "💭 Multiple errors detected. Try: vibecheck?"
        
        if patterns["stuck"]:
            return "🤔 Seems quiet. Need help exploring options?"
        
        if patterns["flow_state"]:
            return "🚀 Great momentum! Keep going!"
        
        if patterns["debugging"]:
            return "🔍 Debugging mode. Remember: test as you go"
        
        if patterns["exploring"]:
            return "🗺️ Exploring well! Focus emerging?"
        
        if patterns["context_pressure"]:
            return "📚 High token usage. Consider summarizing"
        
        # Default
        return "✨ Ready to assist"
    
    def update_statusline(self):
        """Main function to analyze and update statusline"""
        # Load recent telemetry
        telemetry = self.load_recent_telemetry(minutes=5)
        
        # Detect patterns
        patterns = self.detect_patterns(telemetry)
        
        # Generate coaching message
        message = self.generate_coaching(patterns)
        
        # Write status for statusline to read
        status = {
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "patterns": patterns,
            "telemetry_count": len(telemetry)
        }
        
        os.makedirs(os.path.dirname(self.status_file), exist_ok=True)
        with open(self.status_file, 'w') as f:
            json.dump(status, f, indent=2)
        
        return status

def main():
    """Run analyzer and print results"""
    analyzer = TelemetryAnalyzer()
    status = analyzer.update_statusline()
    
    print("=== Telemetry Pattern Analysis ===")
    print(f"Timestamp: {status['timestamp']}")
    print(f"Events analyzed: {status['telemetry_count']}")
    print()
    print("Detected Patterns:")
    for pattern, detected in status['patterns'].items():
        if detected:
            print(f"  ✓ {pattern}")
    print()
    print(f"Coaching Message: {status['message']}")
    print()
    print(f"Status written to: {analyzer.status_file}")

if __name__ == '__main__':
    main()