import { connection } from "..";

function bootstrap(){
    connection.exec(`CREATE TABLE IF NOT EXISTS customer(
        id integer primary key,
        customer_code varchar(128)
    )`)
}


function customerExists(customerCode: string){
    const preparedStatement = connection.prepare("select id from customer where customer_code = ? limit 1")
    const result = preparedStatement.all(customerCode);
    return result.length > 0;
}

function addCostumer(customerCode: string){
    const preparedStatement = connection.prepare("insert into customer(customer_code) values (?)")
    preparedStatement.run(customerCode);
}

export default {
    bootstrap,
    addCostumer,
    customerExists
};