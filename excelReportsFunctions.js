
'use strict';

class ExcelFileOpen {

    constructor(pointerFile) {
        if(!pointerFile) {
            console.log("ERROR:ExcelFileOpen: No se ha seleccionado ningun archivo.");
            throw new Error("No se ha seleccionado ningun archivo.");
        }

        this.file = pointerFile;
        this.contentFile = "";
    }
}


    // *********************************************************
    // Verify the valid structure of data readed from the file based on the headers of info
    function validateContentExcel(dataRows) {
        
        if(dataRows === undefined || dataRows.length <= 0 ) {
            return false;
        }

        if(dataRows[0][ORDER_TYPE] === undefined || 
            dataRows[0][PICK_AREA] === undefined ||
            dataRows[0][CUT_OFF_DATE] === undefined ||
            dataRows[dataRows.length - 1][CUT_OFF_TIME] === undefined ||
            dataRows[dataRows.length - 1][ISELL] === undefined) {
            return false;
        }
    
        return true;
    }


    // *********************************************************
    // Check and remove all elements with "Order Type" different that "PUP"
    function filterOrdersByDate(dataArray, textDate) {
        return dataArray.filter( (row) => { 
            return row[CUT_OFF_DATE].trim() === textDate;
        } );
    }
    

    // *********************************************************
    function readReportsExcel(file, fileDataArray) {

        let excelDataArray = fileDataArray;

        // check the file type
        if(file === undefined || (!file.name.toLowerCase().endsWith(".xlsx") && file.type !== EXCEL_MIME_TYPE) ) {
            console.log("ERROR:readReportsExcel: El archivo \"" + file.name + "\" NO es válido.");
            throw new Error("El archivo \"" + file.name + "\" NO es válido.");
        }

        // Validate the format of the file and data structure
        if(!validateContentExcel(excelDataArray)) {
            console.log("ERROR:readReportsExcel: Contenido del archivo NO válido.");
            throw new Error("Contenido del archivo NO válido.");
        }
        return excelDataArray;
    }


    // *********************************************************
    function mappingArrayDataExcel(dataArrayExcel) {

        let orderDetailsMap = new Map();
        dataArrayExcel.forEach(rowData => {
            
            if(!orderDetailsMap.has(rowData[ISELL])) {
                let newOrder = new Order(rowData);
                orderDetailsMap.set(rowData[ISELL], newOrder);
            }
            
            let producto = new Product(rowData);

            let order = orderDetailsMap.get(rowData[ISELL]);

            order.addProduct(producto, rowData[PICK_AREA]);

            orderDetailsMap.set(rowData[ISELL], order);
        });
        return orderDetailsMap;
    }
