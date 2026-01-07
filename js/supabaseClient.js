
const SUPABASE_URL = "https://awlylgtadbljkjgbneds.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3bHlsZ3RhZGJsamtqZ2JuZWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTU1MzgsImV4cCI6MjA4MDE5MTUzOH0.y7sR5DCDe-aYgzHJ2Wx3DBGJrq9Mq4OTQUGppguyTHM";

// A lib supabase-js já foi carregada via CDN no HTML
const { createClient } = supabase;
const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);