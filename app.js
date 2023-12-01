const axios = require('axios');
const XLSX = require('xlsx');

// Define target shops
const shops = ['hirmer-grosse-groessen', 'hirmer','eckerle'];
const shopurlcode = ['09fc1c43-797b-4681-b6c4-4f325c86b9e5', '8c089adb-e1e5-4b94-b051-10941fd08dde', '10915945-e236-49ad-a72a-5564a236d25b'];

// Step 1: Fetch data from the first API to get all the nodes
async function fetchAllNodeArray(shop) {
    try {
        const response = await axios.get(`https://www.${shop}.de/api/nodeTree`);
        return response.data;
    } catch (error) {
        console.error('Error fetching data from the first API:', error.message);
        throw error;
    }
}

// Step 2: Fetch data from the second API for each node
async function fetchFrontasticDataPerNode(shop, item_id) {
    try {
        const response = await axios.get(`https://www.${shop}.de/node/${item_id}?secret=b75bf8585a25bb03cf9ca7bb439732db`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching data for ${item_id} from the second API:`, error.message);
        return null;
    }
}

async function processData(shop, shopurlcode) {

    // Step 1: Fetch data from the first API ( Node Tree )
    const dataFromFirstAPI = await fetchAllNodeArray(shop);

    // Step 2: Iterate through the array and call the second API for each value
    const processedData = [];
    for (const item of dataFromFirstAPI) {

        //log the task progress
        console.log(`Processing item ${item.id}... index: ${dataFromFirstAPI.indexOf(item) + 1} of ${dataFromFirstAPI.length}`);

        // Call the second API
        const dataFromSecondAPI = await fetchFrontasticDataPerNode(shop , item.id);

        // If the data is null, skip to the next item
        if (!dataFromSecondAPI) {
            continue;
        }

        // Step 3: Select limited information and create a new object
        let tastics = dataFromSecondAPI.page.regions.main.elements[0].tastics;
        let canonical = dataFromSecondAPI.data.tastic[shopurlcode]?.canonical || dataFromSecondAPI.data.tastic[shopurlcode]?.canonical;
             // Step 3: Select limited information and create a new object
             const processedObject = {
                 // Customize this based on the data you want from the second API
                 Name: dataFromSecondAPI.node.configuration.path,
                 URL: `www.${shop}.de/node/${item.id}`,
                 URL_DE: '',
                 URL_EN: '',
                 URL_CS: '',
                 URL_PL: '',
                 seoTitle_de: dataFromSecondAPI.node.configuration.seoTitle?.de || undefined,
                 seoTitle_en: dataFromSecondAPI.node.configuration.seoTitle?.en || undefined,
                 seoTitle_cs: dataFromSecondAPI.node.configuration.seoTitle?.cs || undefined,
                 seoTitle_pl: dataFromSecondAPI.node.configuration.seoTitle?.pl || undefined,
                 seoDescription_de: dataFromSecondAPI.node.configuration.seoDescription?.de || undefined,
                 seoDescription_en: dataFromSecondAPI.node.configuration.seoDescription?.en || undefined,
                 seoDescription_cs: dataFromSecondAPI.node.configuration.seoDescription?.cs || undefined,
                 seoDescription_pl: dataFromSecondAPI.node.configuration.seoDescription?.pl || undefined,

                 // Add empty keys for the tastics as placeholders
                 seoText_de : '',
                 seoText_en : '',
                 seoText_cs : '',
                 seoText_pl : '',
             };

        for (const tastic of tastics) {
            if (tastic.tasticType === 'hirmer/seoText') {
                processedObject.seoText_de = tastic.configuration.seoText.de;
                processedObject.seoText_en = tastic.configuration.seoText.en;
                processedObject.seoText_cs = tastic.configuration.seoText.cs;
                processedObject.seoText_pl = tastic.configuration.seoText.pl;
            }
        }

        // Add the canonical URL
        if (canonical) {
            processedObject.URL_DE = canonical[0] ? `www.${shop}.de${canonical[0].route}` : '';
            processedObject.URL_EN = canonical[1] ? `www.${shop}.de${canonical[1].route}` : '';
            processedObject.URL_CS = canonical[2] ? `www.${shop}.de${canonical[2].route}` : '';
            processedObject.URL_PL = canonical[3] ? `www.${shop}.de${canonical[3].route}` : '';
        }


        // Step 4: Add the processed object to the array
             processedData.push(processedObject);
         }

        // Step 5: Convert the processed data to an XLSX file
         const ws = XLSX.utils.json_to_sheet(processedData);
         const wb = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
         XLSX.writeFile(wb, `output_${shop}.xlsx`);

         // Log the task completion
         console.log('XLSX file created successfully.');

}

// Run the main process for all shops ( can be just one value if the requirement is for only one shop )
for (let i=0; i<shops.length; i++) {
    console.log(`Processing shop ${shops[i]}...`);
    processData(shops[i], shopurlcode[i]).then(r => console.log(`Finished processing shop ${shops[i]}`));
}