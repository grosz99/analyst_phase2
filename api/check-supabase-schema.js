const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkSupabaseSchema() {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  try {
    console.log('🔍 Checking Supabase NCC table structure...');
    
    // Get actual row count
    console.log('📊 Getting actual row count...');
    const { count, error: countError } = await client
      .from('NCC')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting rows:', countError);
    } else {
      console.log('✅ Actual NCC table row count:', count);
    }
    
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

    // Get some sample data to understand the data range
    console.log('\n📊 Getting sample data range...');
    const { data: sampleData, error: sampleError } = await client
      .from('NCC')
      .select('Office, Region, Month')
      .limit(10);
      
    if (!sampleError && sampleData) {
      console.log('✅ Sample data for understanding scale:');
      sampleData.forEach((row, index) => {
        console.log(`${index + 1}. Office: ${row.Office}, Region: ${row.Region}, Month: ${row.Month}`);
      });
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