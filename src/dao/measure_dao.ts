import { connection } from "..";
import { MeasureData } from "../type";
import customer_dao from  "./customer_dao";

function bootstrap(){
    connection.exec(`CREATE TABLE IF NOT EXISTS measures(
        id integer primary key,
        upload_name varchar(128) not null,
        image_url varchar(128) not null,
        has_confirmed int,
        measure_type varchar(16),
        measure_datetime varchar(64),
        measure_uuid varchar(64),
        customer_id int,

        foreign key (customer_id) references customer(id)
    )`)
}

function getMeasuresForCustomer(customerCode: string){
    const preparedStatement = connection.prepare("select m.image_url, date(m.measure_datetime), m.has_confirmed, m.measure_type, m.uuid from measures m inner join on customer c where c.customer_code = ?")

    return preparedStatement.get(customerCode);
}

function measureExist(datetime: Date){
    const preparedStatement = connection.prepare("select id from measures where strftime('%m%Y',measure_datetime) = strftime('%m%Y', ?)")
    const result = preparedStatement.all(datetime.toISOString());

    return result.length > 0;
}

function addMeasure(data: MeasureData, customerCode: string){
    if(!customer_dao.customerExists(customerCode)){
        customer_dao.addCostumer(customerCode)
    }

    const preparedStatement = connection.prepare("insert into measures(upload_name, image_url, has_confirmed, measure_type, measure_datetime, measure_uuid, customer_id) values (?,?,?,?,?,?,(select id from customer where customer_code = ?))")
    preparedStatement.run(data.upload_name, data.image_url, (data.has_confirmed ? 0 : 1), data.measure_type, data.measure_datetime.toISOString(), data.measure_uuid, customerCode)
}

export default {
    bootstrap,
    getMeasuresForCustomer,
    measureExist,
    addMeasure
}