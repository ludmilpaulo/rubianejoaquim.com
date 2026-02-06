#!/usr/bin/env python3
"""
Test script for AI Copilot
Simulates a real user testing the AI Copilot functionality

Usage: python3 test_ai_copilot.py
Make sure requests is installed: pip install requests
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
API_BASE_URL = 'https://ludmilpaulo.pythonanywhere.com/api'
TEST_EMAIL = 'maitland2025@test.com'
TEST_PASSWORD = 'maitland@2025'

# Colors for terminal output
class Colors:
    RESET = '\033[0m'
    BRIGHT = '\033[1m'
    GREEN = '\033[32m'
    RED = '\033[31m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    CYAN = '\033[36m'

def log(message, color=Colors.RESET):
    print(f"{color}{message}{Colors.RESET}")

def login():
    """Step 1: Login and get authentication token"""
    log('\n🔐 Step 1: Logging in...', Colors.CYAN)
    try:
        response = requests.post(
            f'{API_BASE_URL}/auth/login/',
            json={'email': TEST_EMAIL, 'password': TEST_PASSWORD},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'token' in data:
                token = data['token']
                user_email = data.get('user', {}).get('email', TEST_EMAIL)
                log(f'✅ Login successful! User: {user_email}', Colors.GREEN)
                return token
            else:
                log('❌ Login failed: No token in response', Colors.RED)
                log(f'   Response: {json.dumps(data, indent=2)}', Colors.YELLOW)
                return None
        else:
            log(f'❌ Login failed: Status {response.status_code}', Colors.RED)
            try:
                error_data = response.json()
                log(f'   Error: {json.dumps(error_data, indent=2)}', Colors.YELLOW)
            except:
                log(f'   Response: {response.text[:200]}', Colors.YELLOW)
            return None
    except requests.exceptions.RequestException as e:
        log(f'❌ Login failed: {str(e)}', Colors.RED)
        return None

def test_ai_copilot_chat(token):
    """Step 2: Test AI Copilot chat functionality"""
    log('\n🤖 Step 2: Testing AI Copilot Chat...', Colors.CYAN)
    
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json',
    }
    
    test_messages = [
        'Olá! Como posso criar um orçamento?',
        'Como posso economizar dinheiro?',
        'Tenho dívidas, o que devo fazer?',
    ]
    
    conversation_id = None
    results = []
    
    for i, message in enumerate(test_messages, 1):
        log(f'\n📤 Sending message {i}/{len(test_messages)}: "{message}"', Colors.BLUE)
        
        try:
            payload = {
                'message': message,
                'conversation_id': conversation_id if conversation_id else None
            }
            
            response = requests.post(
                f'{API_BASE_URL}/ai-copilot/conversations/chat/',
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract conversation ID
                if 'conversation_id' in data:
                    conversation_id = data['conversation_id']
                    log(f'   💬 Conversation ID: {conversation_id}', Colors.CYAN)
                
                # Extract assistant message
                if 'assistant_message' in data:
                    assistant_msg = data['assistant_message']
                    content = assistant_msg.get('content', '')
                    role = assistant_msg.get('role', 'assistant')
                    msg_id = assistant_msg.get('id', 'N/A')
                    
                    log(f'   🤖 Assistant Response:', Colors.GREEN)
                    log(f'      ID: {msg_id}', Colors.RESET)
                    log(f'      Role: {role}', Colors.RESET)
                    preview = content[:200] + ('...' if len(content) > 200 else '')
                    log(f'      Content: {preview}', Colors.RESET)
                    log(f'      Length: {len(content)} characters', Colors.RESET)
                    
                    if not content or len(content.strip()) == 0:
                        log('   ⚠️  Warning: Empty response content', Colors.YELLOW)
                        results.append(False)
                    else:
                        log(f'   ✅ Response received successfully', Colors.GREEN)
                        results.append(True)
                else:
                    log('   ❌ No assistant_message in response', Colors.RED)
                    log(f'   Response keys: {list(data.keys())}', Colors.YELLOW)
                    results.append(False)
                
                # Check for errors in response
                if 'error' in data:
                    log(f'   ⚠️  Error in response: {data["error"]}', Colors.YELLOW)
                
            else:
                log(f'   ❌ Error: Status {response.status_code}', Colors.RED)
                try:
                    error_data = response.json()
                    log(f'   Error details: {json.dumps(error_data, indent=2)}', Colors.YELLOW)
                except:
                    log(f'   Response: {response.text[:200]}', Colors.YELLOW)
                results.append(False)
            
            # Small delay between messages
            if i < len(test_messages):
                import time
                time.sleep(1)
                
        except requests.exceptions.RequestException as e:
            log(f'   ❌ Request error: {str(e)}', Colors.RED)
            results.append(False)
    
    return all(results), conversation_id

def test_get_conversations(token):
    """Step 3: Test getting conversations list"""
    log('\n📋 Step 3: Testing Get Conversations List...', Colors.CYAN)
    
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json',
    }
    
    try:
        response = requests.get(
            f'{API_BASE_URL}/ai-copilot/conversations/',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            conversations = data.get('results', data) if isinstance(data, dict) else data
            
            if isinstance(conversations, list):
                log(f'   ✅ Found {len(conversations)} conversation(s)', Colors.GREEN)
                
                for idx, conv in enumerate(conversations[:3], 1):
                    title = conv.get('title', 'Untitled')
                    msg_count = conv.get('message_count', 0)
                    log(f'   {idx}. "{title}" - {msg_count} messages', Colors.RESET)
                
                return True
            else:
                log(f'   ⚠️  Unexpected response format', Colors.YELLOW)
                return False
        else:
            log(f'   ❌ Error: Status {response.status_code}', Colors.RED)
            return False
            
    except requests.exceptions.RequestException as e:
        log(f'   ❌ Request error: {str(e)}', Colors.RED)
        return False

def test_get_conversation(token, conversation_id):
    """Step 4: Test getting a specific conversation"""
    if not conversation_id:
        log('\n⏭️  Step 4: Skipping (no conversation ID)', Colors.YELLOW)
        return True
    
    log(f'\n📖 Step 4: Testing Get Conversation {conversation_id}...', Colors.CYAN)
    
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json',
    }
    
    try:
        response = requests.get(
            f'{API_BASE_URL}/ai-copilot/conversations/{conversation_id}/',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            conversation = response.json()
            title = conversation.get('title', 'Untitled')
            messages = conversation.get('messages', [])
            
            if isinstance(messages, dict) and 'results' in messages:
                messages = messages['results']
            
            log(f'   ✅ Conversation loaded: "{title}"', Colors.GREEN)
            log(f'   📨 Total messages: {len(messages)}', Colors.RESET)
            
            for idx, msg in enumerate(messages[-3:], 1):
                role = msg.get('role', 'unknown')
                content = msg.get('content', '')[:100]
                preview = content + ('...' if len(msg.get('content', '')) > 100 else '')
                log(f'   {idx}. [{role}] {preview}', Colors.RESET)
            
            return True
        else:
            log(f'   ❌ Error: Status {response.status_code}', Colors.RED)
            return False
            
    except requests.exceptions.RequestException as e:
        log(f'   ❌ Request error: {str(e)}', Colors.RED)
        return False

def main():
    log('\n' + '='*60, Colors.BRIGHT)
    log('🧪 AI COPILOT TEST SUITE', Colors.BRIGHT)
    log('='*60, Colors.BRIGHT)
    log(f'API URL: {API_BASE_URL}', Colors.CYAN)
    log(f'Test User: {TEST_EMAIL}', Colors.CYAN)
    log(f'Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', Colors.CYAN)
    
    results = {}
    
    # Test 1: Login
    token = login()
    if not token:
        log('\n❌ Cannot proceed without authentication', Colors.RED)
        log('   Please check credentials or create the user first', Colors.YELLOW)
        sys.exit(1)
    
    results['login'] = True
    
    # Test 2: Chat
    chat_success, conversation_id = test_ai_copilot_chat(token)
    results['chat'] = chat_success
    
    # Test 3: Get conversations
    results['conversations'] = test_get_conversations(token)
    
    # Test 4: Get specific conversation
    results['get_conversation'] = test_get_conversation(token, conversation_id)
    
    # Summary
    log('\n' + '='*60, Colors.BRIGHT)
    log('📊 TEST RESULTS SUMMARY', Colors.BRIGHT)
    log('='*60, Colors.BRIGHT)
    
    for test_name, passed in results.items():
        status = '✅ PASS' if passed else '❌ FAIL'
        color = Colors.GREEN if passed else Colors.RED
        log(f'{status} - {test_name}', color)
    
    all_passed = all(results.values())
    
    if all_passed:
        log('\n🎉 All tests passed!', Colors.GREEN)
        sys.exit(0)
    else:
        log('\n⚠️  Some tests failed. Check the output above.', Colors.YELLOW)
        sys.exit(1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        log('\n\n⚠️  Test interrupted by user', Colors.YELLOW)
        sys.exit(1)
    except Exception as e:
        log(f'\n💥 Fatal error: {str(e)}', Colors.RED)
        import traceback
        traceback.print_exc()
        sys.exit(1)
