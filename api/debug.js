// Debug endpoint to check environment variables
module.exports = (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    VITE_API_URL: process.env.VITE_API_URL,
    hasSupabaseURL: !!process.env.SUPABASE_URL,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
};