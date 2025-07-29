const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkSupabaseSchema() {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  try {
    console.log('🔍 Checking Supabase NCC table structure...');
    
    // Get a sample row to see actual column names
    const { data, error } = await client
      .from('NCC')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying NCC table:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ NCC table sample row:');
      console.log(JSON.stringify(data[0], null, 2));
      
      console.log('\n📋 Available columns:');
      Object.keys(data[0]).forEach((col, index) => {
        console.log(`${index + 1}. ${col} (type: ${typeof data[0][col]})`);
      });
    } else {
      console.log('⚠️ No data found in NCC table');
    }

    // Also try to get table info from Supabase metadata
    console.log('\n🔍 Trying to get table metadata...');
    const { data: tableInfo, error: metaError } = await client
      .rpc('get_table_columns', { table_name: 'NCC' })
      .select();

    if (!metaError && tableInfo) {
      console.log('✅ Table metadata:', tableInfo);
    } else {
      console.log('⚠️ Could not get table metadata:', metaError?.message);
    }

  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

checkSupabaseSchema();