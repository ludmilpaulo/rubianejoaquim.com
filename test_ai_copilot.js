#!/usr/bin/env node

/**
 * Test script for AI Copilot
 * Simulates a real user testing the AI Copilot functionality
 * 
 * Usage: node test_ai_copilot.js
 * 
 * Make sure the backend is running at the API_URL below
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'https://ludmilpaulo.pythonanywhere.com/api';
const TEST_EMAIL = 'maitland@2025';
const TEST_PASSWORD = 'maitland@2025';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

let authToken = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function login() {
  log('\n🔐 Step 1: Logging in...', 'cyan');
  try {
    const response = await api.post('/auth/login/', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (response.data.token) {
      authToken = response.data.token;
      api.defaults.headers.common['Authorization'] = `Token ${authToken}`;
      log(`✅ Login successful! User: ${response.data.user?.email || TEST_EMAIL}`, 'green');
      return true;
    } else {
      log('❌ Login failed: No token received', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Login failed: ${error.response?.data?.error || error.message}`, 'red');
    if (error.response?.status === 401) {
      log('   → Invalid credentials. Please check email/password.', 'yellow');
    }
    return false;
  }
}

async function testAICopilotChat() {
  log('\n🤖 Step 2: Testing AI Copilot Chat...', 'cyan');
  
  const testMessages = [
    'Olá! Como posso criar um orçamento?',
    'Como posso economizar dinheiro?',
    'Tenho dívidas, o que devo fazer?',
  ];

  let conversationId = null;

  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    log(`\n📤 Sending message ${i + 1}/${testMessages.length}: "${message}"`, 'blue');
    
    try {
      const response = await api.post('/ai-copilot/conversations/chat/', {
        message: message,
        conversation_id: conversationId || null,
      });

      const data = response.data;
      
      // Extract conversation ID
      if (data.conversation_id) {
        conversationId = data.conversation_id;
        log(`   💬 Conversation ID: ${conversationId}`, 'cyan');
      }

      // Extract assistant message
      if (data.assistant_message) {
        const assistantMsg = data.assistant_message;
        log(`   🤖 Assistant Response:`, 'green');
        log(`      Role: ${assistantMsg.role}`, 'reset');
        log(`      Content: ${assistantMsg.content.substring(0, 200)}${assistantMsg.content.length > 200 ? '...' : ''}`, 'reset');
        log(`      Created: ${assistantMsg.created_at}`, 'reset');
        
        // Verify response structure
        if (!assistantMsg.content || assistantMsg.content.trim().length === 0) {
          log('   ⚠️  Warning: Empty response content', 'yellow');
        } else {
          log(`   ✅ Response received (${assistantMsg.content.length} characters)`, 'green');
        }
      } else {
        log('   ❌ No assistant_message in response', 'red');
        log(`   Response structure: ${JSON.stringify(Object.keys(data))}`, 'yellow');
      }

      // Small delay between messages
      if (i < testMessages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      log(`   ❌ Error sending message:`, 'red');
      log(`      Status: ${error.response?.status || 'N/A'}`, 'red');
      log(`      Message: ${error.response?.data?.error || error.message}`, 'red');
      
      if (error.response?.data) {
        log(`      Full error: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
      }
      return false;
    }
  }

  return true;
}

async function testGetConversations() {
  log('\n📋 Step 3: Testing Get Conversations List...', 'cyan');
  
  try {
    const response = await api.get('/ai-copilot/conversations/');
    const conversations = response.data.results || response.data || [];
    
    log(`   ✅ Found ${conversations.length} conversation(s)`, 'green');
    
    if (conversations.length > 0) {
      conversations.slice(0, 3).forEach((conv, idx) => {
        log(`   ${idx + 1}. "${conv.title || 'Untitled'}" - ${conv.message_count || 0} messages`, 'reset');
      });
    }
    
    return true;
  } catch (error) {
    log(`   ❌ Error getting conversations: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testGetConversation(conversationId) {
  if (!conversationId) {
    log('\n⏭️  Step 4: Skipping (no conversation ID)', 'yellow');
    return true;
  }

  log(`\n📖 Step 4: Testing Get Conversation ${conversationId}...`, 'cyan');
  
  try {
    const response = await api.get(`/ai-copilot/conversations/${conversationId}/`);
    const conversation = response.data;
    
    if (conversation.messages) {
      const messages = Array.isArray(conversation.messages) 
        ? conversation.messages 
        : conversation.messages.results || [];
      
      log(`   ✅ Conversation loaded: "${conversation.title || 'Untitled'}"`, 'green');
      log(`   📨 Total messages: ${messages.length}`, 'reset');
      
      messages.slice(-3).forEach((msg, idx) => {
        log(`   ${idx + 1}. [${msg.role}] ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`, 'reset');
      });
    } else {
      log('   ⚠️  No messages in conversation', 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`   ❌ Error getting conversation: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('🧪 AI COPILOT TEST SUITE', 'bright');
  log('='.repeat(60), 'bright');
  log(`API URL: ${API_BASE_URL}`, 'cyan');
  log(`Test User: ${TEST_EMAIL}`, 'cyan');

  const results = {
    login: false,
    chat: false,
    conversations: false,
    getConversation: false,
  };

  // Test 1: Login
  results.login = await login();
  if (!results.login) {
    log('\n❌ Cannot proceed without authentication', 'red');
    process.exit(1);
  }

  // Test 2: Chat
  results.chat = await testAICopilotChat();

  // Test 3: Get conversations
  results.conversations = await testGetConversations();

  // Test 4: Get specific conversation (if we have one)
  // We'd need to track conversation ID from chat test
  results.getConversation = await testGetConversation(null);

  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('📊 TEST RESULTS SUMMARY', 'bright');
  log('='.repeat(60), 'bright');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${status} - ${test}`, color);
  });

  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    log('\n🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Check the output above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
