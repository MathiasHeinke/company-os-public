import pytest
import re
from pathlib import Path
from gateway import scrub_pii, PII_PATTERNS

def test_scrub_pii():
    test_content = """
apikey = "su_live_1234567890abcdef"
NEXT_PUBLIC_SUPABASE_URL="https://xyz.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhb..."
JWT_SECRET=my_super_secret_jwt_k3y!
"""
    
    scrubbed = scrub_pii(test_content)
    
    # Assert secrets are redacted
    assert "[SECRET_REDACTED]" in scrubbed
    assert "su_live_1234567890abcdef" not in scrubbed
    assert "my_super_secret_jwt_k3y!" not in scrubbed
    
    # Assert that non-secrets are kept
    assert "https://xyz.supabase.co" in scrubbed
