/**
 * Script to add status indexes after columns are created
 * Run this after the initial sync completes successfully
 */

const { sequelize } = require('./config/database');
const Road = require('./models/Road');
const Building = require('./models/Building');
const Infrastructure = require('./models/Infrastructure');
const GreenSpace = require('./models/GreenSpace');
const Parcel = require('./models/Parcel');

async function addStatusIndexes() {
  try {
    console.log('Adding status indexes...');
    
    // Add status index to each model
    await sequelize.getQueryInterface().addIndex('roads', ['status'], {
      name: 'roads_status'
    });
    console.log('✅ Added status index to roads');
    
    await sequelize.getQueryInterface().addIndex('buildings', ['status'], {
      name: 'buildings_status'
    });
    console.log('✅ Added status index to buildings');
    
    await sequelize.getQueryInterface().addIndex('infrastructure', ['status'], {
      name: 'infrastructure_status'
    });
    console.log('✅ Added status index to infrastructure');
    
    await sequelize.getQueryInterface().addIndex('green_spaces', ['status'], {
      name: 'green_spaces_status'
    });
    console.log('✅ Added status index to green_spaces');
    
    await sequelize.getQueryInterface().addIndex('parcels', ['status'], {
      name: 'parcels_status'
    });
    console.log('✅ Added status index to parcels');
    
    console.log('✅ All status indexes added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding status indexes:', error.message);
    // If index already exists, that's okay
    if (error.message.includes('already exists')) {
      console.log('Index already exists, skipping...');
      process.exit(0);
    }
    process.exit(1);
  }
}

addStatusIndexes();

