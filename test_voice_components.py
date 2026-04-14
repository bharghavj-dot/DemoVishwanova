#!/usr/bin/env python3
"""
Test script to verify voice components work on Render
Run this locally and on Render to debug issues
"""

import os
import sys

def test_imports():
    """Test if all required packages are installed"""
    print("🔍 Testing imports...")

    try:
        import google.generativeai as genai
        print("✅ google-generativeai imported")
    except ImportError as e:
        print(f"❌ google-generativeai failed: {e}")
        return False

    try:
        import pyttsx3
        print("✅ pyttsx3 imported")
    except ImportError as e:
        print(f"❌ pyttsx3 failed: {e}")
        return False

    try:
        import twilio
        print("✅ twilio imported")
    except ImportError as e:
        print(f"❌ twilio failed: {e}")
        return False

    try:
        import websockets
        print("✅ websockets imported")
    except ImportError as e:
        print(f"❌ websockets failed: {e}")
        return False

    return True

def test_gemini():
    """Test Gemini API connection"""
    print("\n🤖 Testing Gemini API...")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not set")
        return False

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content("Say 'Hello World' in one word")
        if response and response.text:
            print(f"✅ Gemini works: {response.text.strip()}")
            return True
        else:
            print("❌ Gemini returned empty response")
            return False
    except Exception as e:
        print(f"❌ Gemini error: {e}")
        return False

def test_pyttsx3():
    """Test pyttsx3 TTS generation"""
    print("\n🗣️ Testing pyttsx3 TTS...")

    try:
        import pyttsx3
        import io
        import tempfile
        import os as os_module

        engine = pyttsx3.init()
        engine.setProperty('rate', 150)
        engine.setProperty('volume', 0.9)

        # Test basic functionality
        test_text = "Hello, this is a test."

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            engine.save_to_file(test_text, tmp_path)
            engine.runAndWait()

            # Check if file was created and has content
            if os_module.path.exists(tmp_path):
                file_size = os_module.path.getsize(tmp_path)
                print(f"✅ pyttsx3 generated {file_size} bytes of audio")
                os_module.unlink(tmp_path)
                return True
            else:
                print("❌ pyttsx3 file not created")
                return False

        except Exception as e:
            print(f"❌ pyttsx3 generation error: {e}")
            if os_module.path.exists(tmp_path):
                os_module.unlink(tmp_path)
            return False

    except Exception as e:
        print(f"❌ pyttsx3 init error: {e}")
        return False

def test_twilio():
    """Test Twilio credentials"""
    print("\n📞 Testing Twilio credentials...")

    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    phone = os.environ.get("TWILIO_PHONE_NUMBER")

    if not all([sid, token, phone]):
        print("❌ Missing Twilio environment variables")
        print(f"  TWILIO_ACCOUNT_SID: {'✅' if sid else '❌'}")
        print(f"  TWILIO_AUTH_TOKEN: {'✅' if token else '❌'}")
        print(f"  TWILIO_PHONE_NUMBER: {'✅' if phone else '❌'}")
        return False

    try:
        from twilio.rest import Client
        client = Client(sid, token)

        # Test credentials by getting account info
        account = client.api.accounts(sid).fetch()
        print(f"✅ Twilio connected: {account.friendly_name}")
        return True

    except Exception as e:
        print(f"❌ Twilio error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Voice Components Test Suite")
    print("=" * 40)

    results = []

    # Test imports
    results.append(("Imports", test_imports()))

    # Test Gemini
    results.append(("Gemini API", test_gemini()))

    # Test pyttsx3
    results.append(("pyttsx3 TTS", test_pyttsx3()))

    # Test Twilio
    results.append(("Twilio", test_twilio()))

    # Summary
    print("\n" + "=" * 40)
    print("📊 TEST RESULTS:")

    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test_name}: {status}")
        if not passed:
            all_passed = False

    print("\n" + "=" * 40)
    if all_passed:
        print("🎉 ALL TESTS PASSED! Voice calls should work.")
    else:
        print("⚠️  SOME TESTS FAILED. Check the errors above.")
        print("💡 Common fixes:")
        print("   - Set GEMINI_API_KEY environment variable")
        print("   - Set TWILIO_* environment variables")
        print("   - Check Render logs for pyttsx3 installation issues")

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())