from supabase import create_client, Client
from app.config import settings

# Initialize Supabase client
supabase_client: Client = None

if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
    raise RuntimeError("Supabase URL and Key must be configured. Local JSON database fallback has been removed.")

try:
    supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    print("Supabase client initialized successfully.")
except Exception as e:
    raise RuntimeError(f"Failed to initialize Supabase client: {e}")

