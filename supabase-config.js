const SUPABASE_URL = "https://fpsgcovmuaujbqiiizjh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2CyJXaqgUgaDA3nDa8vjeg_29Xe25MS";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);