const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const db = require('./src/database/db');
const { updateThreatsFromAPI } = require('./src/services/threatFetcher');

// Overriding axios in threatFetcher for testing
const axios = require('axios');
const sinon = require('sinon');

const mockData = [
    {
        group_name: "LockBit",
        post_title: "Empresa X",
        discovered: new Date().toISOString(),
        country: "BR",
        post_url: "http://lockbit.onion/empresax"
    },
    {
        group_name: "Ransomhub",
        post_title: "Company Y",
        discovered: new Date().toISOString(),
        country: "US",
        post_url: "http://ransomhub.onion/companyy"
    }
];

sinon.stub(axios, 'get').resolves({ data: mockData });

async function runTest() {
    console.log("Starting test...");

    // Wait for DB to be ready
    setTimeout(async () => {
        await updateThreatsFromAPI();

        setTimeout(() => {
            db.all("SELECT id, grupo, vitima, pais, email_sent FROM AMEACA WHERE pais IN ('BR', 'US')", [], (err, rows) => {
                console.log("DB Rows:", rows);
                process.exit(0);
            });
        }, 3000); // Wait for async inserts/emails to finish
    }, 1000);
}

runTest();
