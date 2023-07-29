
'use strict';

// *********************************************************
// *********************************************************

class OrderType {
    constructor(orderType, cutOffTime){
        this.orderType      = orderType.trim();
        this.cutOffTime     = cutOffTime.trim();

        this[MARKET_HALL]   = 0;
        this[SELF_SERVICE]  = 0;
        this[WAREHOUSE]     = 0;

        this.isells         = [];
    }

    addOrder(order){
        if(order.containPickArea(MARKET_HALL)){
            this[MARKET_HALL]++;
        }

        if(order.containPickArea(SELF_SERVICE)){
            this[SELF_SERVICE]++;
        }

        if(order.containPickArea(WAREHOUSE)){
            this[WAREHOUSE]++;
        }

        this.isells.push(order[ISELL]);
    }
}


// *********************************************************
// *********************************************************

class Order {

    constructor( rowData ){
        this[ISELL]             = rowData[ISELL].trim();
        this[ORDER_TYPE]        = rowData[ORDER_TYPE].trim();
        this[CUT_OFF_TIME]      = rowData[CUT_OFF_TIME].trim();

        this.pickAreasOrder     = new Map([
            [MARKET_HALL, []],
            [SELF_SERVICE, []], 
            [WAREHOUSE, []]
        ]);

        this.totalOrderPackages = 0;
        this.totalOrderVolume   = 0;
        this.totalOrderWeight   = 0;
    }

    addProduct(product, pickArea){
        this.pickAreasOrder.get(pickArea).push(product);
    }

    // show if the order has items in a specific pick area 
    containPickArea(area){
        let orderDetail = this;
        if(orderDetail.pickAreasOrder.get(area).length < 1 ){
            return false;
        }
        return true;
    }
}


// *********************************************************
// *********************************************************

class Product {
    constructor(excelRow){
        this[ARTICLE_NAME]      = excelRow[ARTICLE_NAME].trim();
        this[ARTICLE_NUMBER]    = excelRow[ARTICLE_NUMBER].trim();
        this[PACKAGES]          = Number (excelRow[PACKAGES].trim());
        this[WEIGHT]            = Number (excelRow[WEIGHT].trim());
        this[VOLUME_ORDERED]    = Number (excelRow[VOLUME_ORDERED].trim());
        this[ORDERED_QTY]       = Number (excelRow[ORDERED_QTY].trim());
        this[ARTICLES]          = Number (excelRow[ARTICLES].trim());
    }
}

// *********************************************************
// *********************************************************

const loadFile = document.getElementById("load-file");
const loadFileLabel = document.getElementById("load-file-label");
const workDate = document.getElementById("work-date");
const goButton = document.getElementById("go-button");

const loadingFrame = document.getElementById("loading-frame");
const startPanel = document.getElementById("start-panel");
const dataPanel = document.getElementById("data-panel");
const tableBody = document.getElementById("table-body");
const printButton = document.getElementById("print-button");
const title = document.getElementById("title");
// find panel button main page -> div container 
const findBox = document.getElementById("find-box");
// find button main page 
const findButton = document.getElementById("find-button");
const foundItemsPanel = document.getElementById("found-items");

// finding panel
const findingFrame = document.getElementById("finding-frame");
const findingText = document.getElementById("finding-text");
const findCancelB = document.getElementById("find-cancel-b");
const findIsellRefButton = document.getElementById("find-submit-b");
const foundItemsTable = document.getElementById("found-items-content");

const foundItemDetailsData = document.getElementById("found-item-details-data");

const foundItemDetailsClose = document.getElementById("found-item-details-close");

const footerVersion = document.getElementById("version-footer");



    // *********************************************************

    const VERSION = "1.0";
    const EXCEL_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    // required columns from 'By Status' file
        const ISELL             = "ISELL_ORDER_NUMBER";
        const ARTICLE_NAME      = "ARTICLE_NAME";
        const ARTICLE_NUMBER    = "ARTICLE_NUMBER";
        const ORDER_TYPE        = "ORDER_TYPE";
        const PACKAGES          = "PACKAGES";
        const WEIGHT            = "WEIGHT";
        const VOLUME_ORDERED    = "VOLUME_ORDERED";
        const ARTICLES          = "ARTICLES";
        const ORDERED_QTY       = "ORDERED_QTY";
        const PICK_AREA         = "PICK_AREA";
        const CUT_OFF_DATE      = "CUT_OFF_DATE";
        const CUT_OFF_TIME      = "CUT_OFF_TIME";


    const WORKING_SHEET = "DATA";
    const MARKET_HALL = "MARKETHALL";
    const SELF_SERVICE = "SELFSERVE";
    const WAREHOUSE = "FULLSERVE_INTERNAL";

    const FIND_BY_ISELL = "ISELL";
    const FIND_BY_REFERENCE = "REFERENCE";

    let contentData = [];
    let referencesMap = new Map();
    let isellsMap = new Map();
    let ordersTypes = new Map();














    // *********************************************************
    // *********************************************************
    loadFile.addEventListener("change", openFile);

    goButton.addEventListener("click", proccesData );

    tableBody.addEventListener('click', showRowDetails );

    printButton.addEventListener('click', printDocument);

    // show find dialog-box
    findButton.addEventListener('click', function() {
        findingFrame.classList.remove("no-visible");
        findingText.value = "";
        foundItemsTable.innerHTML = "";
    });

    findCancelB.addEventListener('click', () => {
        findingText.value = "";
        findingText.classList.remove("error");
        document.getElementById("find-error").classList.add("no-visible");
        findingFrame.classList.add("no-visible");
        foundItemsTable.innerHTML = "";
        foundItemsPanel.classList.add("no-visible");
    });

    findIsellRefButton.addEventListener('click', findIsellRef );

    foundItemDetailsClose.addEventListener('click', () => {
        foundItemDetailsClose.parentElement.classList.add("no-visible");
    });




    // *********************************************************
    // *********************************************************
    // code to be executed loading page.
    initializePage();


    // *********************************************************
    // Function to initialize the original values
    function initializePage() {
        console.log("Inicializando valores originales...");
        loadFileLabel.innerText = 'Cargar Reporte...';
        loadingFrame.classList.add("no-visible");
        document.title = title.innerText = "Pedidos por flujos";
        findBox.style.display = "none";
        findingText.value = "";
        
        footerVersion.innerText = "Versión " + VERSION + footerVersion.innerText;

        contentData = [];
        isellsMap = new Map();
        ordersTypes = new Map();
        referencesMap = new Map();
        workDate.valueAsDate = new Date("2023-07-04");
    }

    // *********************************************************
    // Function to validate a given date
    function validateDate(inputDate) {
        const date = inputDate.valueAsDate;
        if(!date ){
            console.log("COMMONS:validateDate: La fecha seleccionada es inválida.");
            throw new Error("La fecha seleccionada es inválida.");
        } 
        return inputDate.value;
    }


    // *********************************************************
    // Function to read a selected file
    function openFile(evento) {
        try {
            let file = evento.target.files[0];
            loadingFrame.classList.remove("no-visible");

            let fileStatus = new ExcelFileOpen(file);

            loadFileLabel.innerText = fileStatus.file.name;

            loadReportsExcel(fileStatus);
        } catch (error) {
            console.log("ERROR:openFile: ", error);
            alert(error.message);
            initializePage();
        }
    }


    // *********************************************************
    function loadReportsExcel (excelFile){

        let fileReader = new FileReader();
        const read = "read";
        const utils = "utils";
        const sheet_to_row_object_array = "sheet_to_row_object_array";

        fileReader.onloadend = (event) => { 
            loadingFrame.classList.add("no-visible");
        };

        fileReader.readAsArrayBuffer(excelFile.file);
        fileReader.onload =  function(){
            try {
                let buffer = this.result;
                let workbook =  XLSX[read](buffer);
                let contentFile =  XLSX[utils][sheet_to_row_object_array](workbook.Sheets[WORKING_SHEET]);

                // process and clean info from the file
                let arrayExcel = readReportsExcel(excelFile.file, contentFile);
                console.log("Carga \"" + excelFile.file.name + "\" Finalizada!", arrayExcel); 

                contentData = arrayExcel;
                referencesMap = createReferencesMap(contentData);

            } catch (error) {
                console.log("ERROR:", error);
                alert(error.message);
                initializePage();
            }
        };
    }


    // *********************************************************
    function createReferencesMap( dataArray ){

        const refMap = new Map();
        dataArray.forEach( value => {
            if(!refMap.has(value[ARTICLE_NUMBER])) {
                refMap.set(value[ARTICLE_NUMBER], {
                        ARTICLE_NUMBER : value[ARTICLE_NUMBER], 
                        ARTICLE_NAME : value[ARTICLE_NAME],
                        isellsArray : []
                    } );
            }
            let order = {
                [ISELL] : value[ISELL], 
                [ORDER_TYPE] : value[ORDER_TYPE],
                [CUT_OFF_TIME] : value[CUT_OFF_TIME]
            };

            refMap.get(value[ARTICLE_NUMBER]).isellsArray.push(order);
            // console.log("Objeto Referencia: ", value[ARTICLE_NUMBER], refMap.get(value[ARTICLE_NUMBER]));
        });
        return refMap;
    }


    // *********************************************************
    // *********************************************************
    // ************ PROCCESS DATA ************

    function proccesData(){

        try {
            const dateCutOffDate = validateDate(workDate);

            if(contentData === undefined || contentData <= 0 ){
                console.log("WARNING:proccesData: No se ha seleccionado un archivo de datos válido.")
                throw new Error("No se ha seleccionado un archivo de datos válido.");
            }

            contentData = filterOrdersByDate(contentData, dateCutOffDate);

            isellsMap = mappingArrayDataExcel( contentData );

            isellsMap.forEach( (order, isell)  => {

                if(!ordersTypes.has((order[ORDER_TYPE] + ',' + order[CUT_OFF_TIME]))){
                    let newOrderType = new OrderType( order[ORDER_TYPE], order[CUT_OFF_TIME]);
                    ordersTypes.set((order[ORDER_TYPE] + ',' + order[CUT_OFF_TIME]), newOrderType);
                }
                
                let orderType = ordersTypes.get((order[ORDER_TYPE] + ',' + order[CUT_OFF_TIME]));

                orderType.addOrder(order);

                ordersTypes.set((order[ORDER_TYPE] + ',' + order[CUT_OFF_TIME]), orderType);
            });

            let keysOrderTypes = [];
            ordersTypes.forEach( ( value, key ) => {
                keysOrderTypes.push(key);
            });

            let totalsOrderTypes = new Map();
            keysOrderTypes.sort().forEach( key => {
                
                let orderType = ordersTypes.get(key);

                // console.log("orderType: ", orderType);
                
                let keyParts = key.split(',');

                if(!totalsOrderTypes.has(keyParts[0])){
                    totalsOrderTypes.set(keyParts[0], { keyType : keyParts[0], keyCOT : new Set(), totalMarketHall : 0, totalSelfService : 0, totalWarehouse : 0, totalIsells : 0 } );
                }

                let totalByType = totalsOrderTypes.get(keyParts[0]);

                totalByType.totalMarketHall += orderType[MARKET_HALL];
                totalByType.totalSelfService += orderType[SELF_SERVICE];
                totalByType.totalWarehouse += orderType[WAREHOUSE];
                totalByType.totalIsells += orderType.isells.length;
                totalByType.keyCOT.add(keyParts[1]);

                totalsOrderTypes.set(keyParts[0], totalByType);
            });

            console.log("Totales por flujo: ", totalsOrderTypes);

            startPanel.classList.add("no-visible");
            dataPanel.classList.remove("no-visible");
            findBox.style.display = "flex";

            // showContent(keysOrderTypes, ordersTypes);
            showContent(totalsOrderTypes, ordersTypes);

            // Set document title for printing purpose
            document.title = title.innerText = (title.innerText + " (" + workDate.value + ")" );

        } catch (error) {
            console.log("ERROR:proccesData: ", error);
            alert(error.message);
            initializePage();
        }
    }


    // *********************************************************
    function printDocument() {

        const htmlListOfRows = document.getElementsByClassName("details");
        for (const htmlRow of htmlListOfRows) {
            htmlRow.classList.remove("hide-details");
        }
        console.log("Printing Document...");

        window.print();
    }

    
    // *********************************************************
    function reverseRowVisibility(element, idType){

        if(element.id !== idType ){
            return;
        }
        element.classList.toggle("hide-details");
        reverseRowVisibility(element.nextSibling, idType);
    }


    // *********************************************************
    function validateIsellRef(text){

        const pattern = /[^0-9]/;
        if(text === ''){
            console.log("WARNING:validateIsellRef: No hay nada que buscar.");
            throw new Error("No hay nada que buscar.");
        }
        if(pattern.test(text)){
            console.log("WARNING:validateIsellRef: Unicamente se permiten números.");
            throw new Error("Unicamente se permiten números.");
        }
        return text;
    }
    
    
    // *********************************************************
    function findByIsell( isellText, dataMap ){

        const isellsFound = new Map();
        dataMap.forEach( (value, key ) => {
            if(key.includes(isellText)){
                isellsFound.set(key, value);
            }
        });
        return isellsFound;
    }


    // *********************************************************
    function findByReference( referenceText, refMap ){
        
        const referencesFound = new Map();
    
        refMap.forEach( (value, key ) => {
            if(key.includes(referenceText)){
                referencesFound.set(key, value);
            }
            // console.log("valores referencias: ", typeof(key), key, value);
        });
        // console.log("referencias encontrADAS: ", referencesFound);
        return referencesFound;
    }


    // *********************************************************
    function findIsellRef() {
        try {
            document.getElementById("find-error").innerText = "";
            document.getElementById("find-error").classList.add("no-visible");
            findingText.classList.remove("error");
            
            const value = validateIsellRef(findingText.value);
            const typeSearch = document.querySelector("input[name='find-type']:checked").value;
            let foundItems = undefined;
            let htmlFoundItems = "";

            switch (typeSearch) {
                case FIND_BY_ISELL:
                    foundItems = findByIsell(value, isellsMap);
                    htmlFoundItems = drawFindByIsellItems(foundItems);
                    break;
                case FIND_BY_REFERENCE:
                    foundItems = findByReference( value, referencesMap );
                    htmlFoundItems = drawFindByReferenceItems(foundItems);
                    break;
                default:
                    return;
            }

            previsualizeFoundItems(htmlFoundItems);

        } catch (error) {
            document.getElementById("find-error").innerText = error.message;
            document.getElementById("find-error").classList.remove("no-visible");
            findingText.classList.add("error");
            console.log("ERROR:", error);
        }
    }


    // *********************************************************
    function previsualizeFoundItems( foundItemsHtmlElements ){
        
        foundItemsPanel.classList.remove("no-visible");
        foundItemsTable.innerHTML = "";

        if( foundItemsHtmlElements === "" ) {
            foundItemsTable.innerHTML = "<tr><td>No se encontraron coincidencias.</td></tr>";
        } else {
            foundItemsTable.innerHTML = foundItemsHtmlElements;            
        }
    }


    // *********************************************************
    function drawFindByIsellItems(itemsMap) {

        let htmlTable = "";
        htmlTable += "<tr>";

        htmlTable += "<th>";
        htmlTable += "ISELL";
        htmlTable += "</th>";

        htmlTable += "<th>";
        htmlTable += "Tipo de Flujo";
        htmlTable += "</th>";

        htmlTable += "<th>";
        htmlTable += "COT";
        htmlTable += "</th>";

        htmlTable += "<th>";
        htmlTable += " ";
        htmlTable += "</th>";

        htmlTable += "</tr>";

        itemsMap.forEach( (value, key ) => {
            htmlTable += drawItemByIsell( value );
        });

        return htmlTable;
    }


    // *********************************************************
    function drawItemByIsell(item){
        let htmlContent = "";

        console.log("Item: ", item);

        htmlContent += "<tr>";

        htmlContent += "<td>";
        htmlContent += item[ISELL];
        htmlContent += "</td>";

        htmlContent += "<td>";
        htmlContent += item[ORDER_TYPE];
        htmlContent += "</td>";

        htmlContent += "<td>";
        htmlContent += item[CUT_OFF_TIME];
        htmlContent += "</td>";

        htmlContent += "<td id='";
        htmlContent += item[ISELL];
        htmlContent += "' class='found-item-icon'";
        htmlContent += " onclick='javascript:foundItemByIsellShowDetails(\"";
        htmlContent += item[ISELL];
        htmlContent += "\")' >";
            // SVG icon
            htmlContent += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">';
            htmlContent += '<path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>';
            htmlContent += '</svg>';
        htmlContent += "</td>";

        htmlContent += "</tr>";
        return htmlContent;
    }


    // *********************************************************
    function drawOrderProductsDetails(orderProductsArray ) {
        console.log("Order Details section: ",  orderProductsArray );

        let htmlProducts = "";

        orderProductsArray.forEach( product => {
            console.log("Producto: ", product);
            htmlProducts += "<tr>";

            htmlProducts += "<td class='centrar'>";
            htmlProducts += product[ARTICLE_NUMBER];
            htmlProducts += "</td>";

            htmlProducts += "<td>";
            htmlProducts += product[ARTICLE_NAME];
            htmlProducts += "</td>";
            
            htmlProducts += "<td class='centrar'>";
            htmlProducts += product[ORDERED_QTY];
            htmlProducts += "</td>";
            
            htmlProducts += "</tr>";
        });

        return htmlProducts;
    }
    // *********************************************************
    // function to show ISELL order details
    function foundItemByIsellShowDetails(isell) {

        // foundItemDetailsData.parentElement.parentElement.parentElement.classList.remove("no-visible");
        document.getElementById("found-item-details").classList.remove("no-visible");
        
        const item = isellsMap.get(isell);
        console.log("Detalles: ", item);

        let htmlDetails = "";

        htmlDetails += "<tr>";
        htmlDetails += "<td class='header'>ISELL: </td>";
        htmlDetails += "<td class='bold header' >";
        htmlDetails += item[ISELL];
        htmlDetails += "</td>";
        htmlDetails += "</tr>";

        htmlDetails += "<tr>";
        htmlDetails += "<td class='header'>CUT OFF DATE: </td>";
        htmlDetails += "<td class='header'>";
        htmlDetails += "04-07-2023";
        htmlDetails += "</td>";
        htmlDetails += "</tr>";

        htmlDetails += "<tr>";
        htmlDetails += "<td class='header'>CUT OFF TIME: </td>";
        htmlDetails += "<td class='header'>";
        htmlDetails += item[CUT_OFF_TIME];
        htmlDetails += "</td>";
        htmlDetails += "</tr>";

        htmlDetails += "<tr>";
        htmlDetails += "<td class='header'>Tipo de Flujo: </td>";
        htmlDetails += "<td class='header'>";
        htmlDetails += item[ORDER_TYPE];
        htmlDetails += "</td>";
        htmlDetails += "</tr>";

        htmlDetails += "<tr><td colspan='3' class='centrar back-1 bold' >";
        htmlDetails += "Market";
        htmlDetails += "</td></tr>";

        htmlDetails += drawOrderProductsDetails(item.pickAreasOrder.get(MARKET_HALL));

        htmlDetails += "<tr><td colspan='3' class='centrar back-1 bold' >";
        htmlDetails += "Auto Servicio";
        htmlDetails += "</td></tr>";

        htmlDetails += drawOrderProductsDetails(item.pickAreasOrder.get(SELF_SERVICE));

        htmlDetails += "<tr><td colspan='3' class='centrar back-1 bold' >";
        htmlDetails += "Full - Almacén";
        htmlDetails += "</td></tr>";

        htmlDetails += drawOrderProductsDetails(item.pickAreasOrder.get(WAREHOUSE));
        
        htmlDetails += "<tr class='centrar back-1 bold'>";
        htmlDetails += "<td>Paquetes</td>";
        htmlDetails += "<td>Peso</td>";
        htmlDetails += "<td>Volumen</td>";
        htmlDetails += "</tr>";

        htmlDetails += "<tr>";
        htmlDetails += "<td class='centrar' >";
        htmlDetails += item.totalOrderPackages;
        htmlDetails += "</td>";
        
        htmlDetails += "<td class='centrar' >";
        htmlDetails += item.totalOrderWeight;
        htmlDetails += "</td>";
        
        htmlDetails += "<td class='centrar' >";
        htmlDetails += item.totalOrderVolume;
        htmlDetails += "</td>";
        htmlDetails += "</tr>";

        foundItemDetailsData.innerHTML = htmlDetails;
    }


    // *********************************************************
    function drawFindByReferenceItems(itemsMap){

        let htmlTable = "";
        htmlTable += "<tr>";

        htmlTable += "<th>";
        htmlTable += "Referencia";
        htmlTable += "</th>";

        htmlTable += "<th>";
        htmlTable += "Producto";
        htmlTable += "</th>";

        htmlTable += "<th>";
        htmlTable += "Pedidos";
        htmlTable += "</th>";

        htmlTable += "</tr>";

        itemsMap.forEach( (value, key ) => {
            htmlTable += drawItemByReference( value );
        });

        return htmlTable;
    }


    // *********************************************************
    function drawItemByReference( item ){
        let htmlContent = "";

        console.log("Item: ", item);

        htmlContent += "<tr>";

        htmlContent += "<td>";
        htmlContent += item[ARTICLE_NUMBER];
        htmlContent += "</td>";

        htmlContent += "<td>";
        htmlContent += item[ARTICLE_NAME];
        htmlContent += "</td>";

        htmlContent += "<td class='centrar found-item-icon'";
        // htmlContent += " onclick='javascript:foundItemByIsellShowDetails(\"";
        htmlContent += " onclick='javascript:foundItemByReferenceShowIsells(\"";
        htmlContent += item[ARTICLE_NUMBER];
        htmlContent += "\")' >";
            // SVG icon
            htmlContent += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">';
            htmlContent += '<path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>';
            htmlContent += '</svg>';
        htmlContent += "</td>";

        htmlContent += "</tr>";
        return htmlContent;
    }


    // *********************************************************
    function foundItemByReferenceShowIsells(reference) {

        // foundItemDetailsData.parentElement.parentElement.parentElement.classList.remove("no-visible");
        document.getElementById("found-item-details").classList.remove("no-visible");
        
        const item = referencesMap.get(reference);
        console.log("Detalles: ", item);

        let htmlDetails = "";

        htmlDetails += "<tr>";
        htmlDetails += "<td class='header'>Referencia: </td>";
        htmlDetails += "<td class='bold header' >";
        htmlDetails += item[ARTICLE_NUMBER];
        htmlDetails += "</td>";
        htmlDetails += "</tr>";

        htmlDetails += "<tr>";
        htmlDetails += "<td class='header'>Articulo: </td>";
        htmlDetails += "<td class='header'>";
        htmlDetails += item[ARTICLE_NAME];
        htmlDetails += "</td>";
        htmlDetails += "</tr>";

        htmlDetails += "<tr><td colspan='3' class='centrar back-1 bold' >";
        htmlDetails += "Listado de Pedidos";
        htmlDetails += "</td></tr>";

        htmlDetails += drawReferenceBelongsToOrders(item.isellsArray);

        foundItemDetailsData.innerHTML = htmlDetails;
    }


    // *********************************************************
    function drawReferenceBelongsToOrders(itemsArray){

        console.log("ISELL from Reference: ", itemsArray);

        let htmlRow = "";

        itemsArray.forEach( isell => {
            htmlRow += "<tr>";

            htmlRow += "<td>";
            htmlRow += isell[ISELL];
            htmlRow += "</td>";

            htmlRow += "<td>";
            htmlRow += isell[ORDER_TYPE];
            htmlRow += "</td>";

            htmlRow += "<td>";
            htmlRow += isell[CUT_OFF_TIME];
            htmlRow += "</td>";

            htmlRow += "</tr>";
        });

        return htmlRow;
    }


    // *********************************************************
    function showRowDetails(evento){

        // console.log("Evento: ", evento.target);
        const element = evento.target;
        if(element.classList.contains("expand-cover")){
            // console.log("elemento: ", element);
            
            const rowElement = element.parentElement.parentElement.parentElement;
            console.log("BisAbuelo: ", rowElement);
            reverseRowVisibility(rowElement.nextSibling, rowElement.id);
        }
    }


    // *********************************************************
    function showContent(dataMapMain, detailMap) {

        // console.log("ShowContent: ", dataMap);
        // Inicializar valores para la tabla, en los datos y en la vista
        tableBody.innerHTML = "";
        let dataTableBody = "";

        // draw each row
        dataMapMain.forEach( (value, key) => {
            dataTableBody += drawMainRow(value, key);
        });

        // calculate the total by MARKET_HALL, SELF_SERVICE and WAREHOUSE
        let total_MH = 0;
        let total_SS = 0;
        let total_WH = 0;
        dataMapMain.forEach( (value, key) => {
            total_MH += value.totalMarketHall;
            total_SS += value.totalSelfService;
            total_WH += value.totalWarehouse;
        });

        dataTableBody += showTotals(total_MH, total_SS, total_WH);
        tableBody.innerHTML += dataTableBody;
    }


    // *********************************************************
    function drawMainRow( row, key ) {

        let htmlRow = "";
        // console.log("Show Content -> Key:", key, " Row : ", row);

        htmlRow += "<tr id='" + key + "' class='centrar main-type'>";

        htmlRow += "<td class='align-left'>";
        htmlRow += key;
        htmlRow += "</td>";

        htmlRow += "<td class='expand'>";
        htmlRow += "<div class='expand-base'>";
        // SVG Cover for event listener
        htmlRow += "<div class='expand-cover'>";
        htmlRow += "</div>";
        
        // SVG icon
        htmlRow += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">';
        htmlRow += '<path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>';
        htmlRow += '</svg>';

        htmlRow += "</div>";
        htmlRow += "</td>"; 

        htmlRow += "<td class='isell'>";
        htmlRow += row.totalIsells;
        htmlRow += "</td>"; 

        htmlRow += "<td>";
        htmlRow += row.totalMarketHall;
        htmlRow += "</td>"; 
        
        htmlRow += "<td>";
        htmlRow += row.totalSelfService;
        htmlRow += "</td>"; 

        htmlRow += "<td>";
        htmlRow += row.totalWarehouse;
        htmlRow += "</td>";

        htmlRow += "<td>";
        htmlRow += (row.totalMarketHall + row.totalSelfService + row.totalWarehouse );
        htmlRow += "</td>";
        
        htmlRow += "</tr>";

        let colorDetailsRow = true;
        row.keyCOT.forEach( cot => {
            htmlRow += showDetailRow( key, cot, ordersTypes.get( (key + ',' + cot )), colorDetailsRow ); 
            colorDetailsRow = !colorDetailsRow;
        });
        
        return htmlRow;
    }


    // *********************************************************
    // Function to draw the detail info for each Type of order
    function showDetailRow( type, cot, orderTypeDetail, colorRow){

        // console.log("Key Type: ", type, "COTs: ", cot, "Detail: ", orderTypeDetail);
        let detailRow = "";

        detailRow += "<tr id='" + type + "' class='centrar details hide-details " + ( colorRow ? "row" : "" ) + "'>";

        detailRow += "<td>";
        detailRow += "";
        detailRow += "</td>";
        
        detailRow += "<td>";
        detailRow += cot;
        detailRow += "</td>";
        
        detailRow += "<td>";
        detailRow += "";
        detailRow += "</td>";
        
        detailRow += "<td>";
        detailRow += orderTypeDetail[MARKET_HALL];
        detailRow += "</td>";

        detailRow += "<td>";
        detailRow += orderTypeDetail[SELF_SERVICE];
        detailRow += "</td>";

        detailRow += "<td>";
        detailRow += orderTypeDetail[WAREHOUSE];
        detailRow += "</td>";

        detailRow += "<td>";
        detailRow += ( orderTypeDetail[MARKET_HALL] + orderTypeDetail[SELF_SERVICE] + orderTypeDetail[WAREHOUSE] );
        detailRow += "</td>";

        detailRow += "</tr>";

        return detailRow;
    }


    // *********************************************************
    function showTotals(totalMarket, totalSelf, totalWarehouse ){
        let htmlTotals = "";

        htmlTotals += "<tr class='centrar totals'>";
        htmlTotals += "<td colspan='2'>";
        htmlTotals += "TOTALES";
        htmlTotals += "</td>";

        htmlTotals += "<td class='isell'>";
        htmlTotals += isellsMap.size;
        htmlTotals += "</td>";

        htmlTotals += "<td>";
        htmlTotals += totalMarket;
        htmlTotals += "</td>";

        htmlTotals += "<td>";
        htmlTotals += totalSelf;
        htmlTotals += "</td>";

        htmlTotals += "<td>";
        htmlTotals += totalWarehouse;
        htmlTotals += "</td>";
        
        htmlTotals += "<td>";
        htmlTotals += (totalMarket + totalSelf + totalWarehouse);
        htmlTotals += "</td>";

        htmlTotals += "</tr>";

        return htmlTotals;
    }









