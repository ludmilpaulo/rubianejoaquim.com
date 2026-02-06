# OpenAI API Setup for AI Copilot

## Overview
The AI Financial Copilot uses OpenAI's GPT-4o-mini model to provide intelligent, personalized financial advice. To enable OpenAI responses, you need to configure the API key.

## Setup Instructions

### 1. Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)
5. **Important**: Set up billing at https://platform.openai.com/account/billing (OpenAI requires billing to be active)

### 2. Configure in Production (PythonAnywhere)

#### Option A: Using Web Interface
1. Log into PythonAnywhere dashboard
2. Go to **Files** tab
3. Navigate to `/home/ludmilpaulo/rubianejoaquim.com/backend/`
4. Edit or create `.env` file
5. Add the following line:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   OPENAI_MODEL=gpt-4o-mini
   ```
6. Save the file
7. **Restart your web app** (Important: Changes to .env require a restart)

#### Option B: Using SSH/Bash Console
```bash
cd /home/ludmilpaulo/rubianejoaquim.com/backend/
nano .env
# Add: OPENAI_API_KEY=sk-your-actual-api-key-here
# Add: OPENAI_MODEL=gpt-4o-mini
# Save and exit (Ctrl+X, then Y, then Enter)
```

### 3. Verify Configuration

After setting up, you can verify it's working:

1. **Check logs**: Look for "Calling OpenAI API for AI Copilot response" in your error logs
2. **Test the API**: Send a message through the AI Copilot - if you get a personalized, detailed response (not the fallback), OpenAI is working
3. **Check error logs**: If OpenAI fails, you'll see error messages in the logs

### 4. Troubleshooting

#### Issue: Still getting fallback responses
- **Check**: Is `OPENAI_API_KEY` set in `.env`?
- **Check**: Did you restart the web app after adding the key?
- **Check**: Is billing active on your OpenAI account?
- **Check**: Are there any errors in the error logs?

#### Issue: OpenAI API errors
- **Check billing**: Make sure billing is set up at https://platform.openai.com/account/billing
- **Check quota**: Verify you have available credits/quota
- **Check API key**: Ensure the key is correct and hasn't been revoked
- **Check logs**: Look at error logs for specific error messages

#### Issue: Empty responses
- This usually means the API key is invalid or billing isn't set up
- Check OpenAI dashboard for account status

## Current Status

To check if OpenAI is currently configured:
- Look for `OPENAI_API_KEY` in your `.env` file
- Check error logs for "OPENAI_API_KEY not configured" warnings
- Test the AI Copilot - fallback responses indicate OpenAI is not configured

## Cost Considerations

- **Model**: `gpt-4o-mini` (cost-effective option)
- **Pricing**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Typical cost**: ~$0.001-0.002 per conversation (very affordable)
- **Monitor usage**: Check usage at https://platform.openai.com/usage

## Security Notes

- **Never commit** `.env` file to git (it's already in `.gitignore`)
- **Never share** your API key publicly
- **Rotate keys** periodically for security
- **Set usage limits** in OpenAI dashboard to prevent unexpected charges

## Fallback Behavior

If OpenAI is not configured or fails:
- The system uses intelligent fallback responses
- Responses are still helpful but less personalized
- Users see a note that OpenAI is not configured
- The system continues to function normally
