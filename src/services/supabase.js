import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = `
⚠️ Missing Supabase environment variables!

Please create a .env file in the root directory with:
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

You can copy .env.example to .env and fill in your values.
  `;
  console.error(errorMsg);
  
  // Show user-friendly error in development
  if (import.meta.env.DEV) {
    alert('⚠️ Missing Supabase Configuration\n\nPlease create a .env file with your Supabase credentials.\n\nSee README.md for setup instructions.');
  }
}

// Create client with fallback to prevent crash, but it won't work without valid credentials
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
