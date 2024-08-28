import { RunResult } from "better-sqlite3";
import { connection } from "..";
import { ConfirmData, MeasureData } from "../type";
import customer_dao from "./customer_dao";

function bootstrap() {
    connection.exec(`CREATE TABLE IF NOT EXISTS measures(
        id integer primary key,
        upload_name varchar(128) not null,
        image_url varchar(128) not null,
        has_confirmed int,
        measure_value int,
        measure_type varchar(16),
        measure_datetime varchar(64),
        measure_uuid varchar(64),
        customer_id int,

        foreign key (customer_id) references customer(id)
    )`)
}

function addMeasure(data: MeasureData, customerCode: string) {
    if (!customer_dao.customerExists(customerCode)) {
        customer_dao.addCostumer(customerCode)
    }

    const preparedStatement = connection.prepare("insert into measures(upload_name, image_url, has_confirmed, measure_type, measure_datetime, measure_uuid, measure_value, customer_id) values (?,?,?,?,?,?,?,(select id from customer where customer_code = ?))")
    preparedStatement.bind(data.upload_name, data.image_url, (data.has_confirmed ? 1 : 0), data.measure_type, data.measure_datetime.toISOString(), data.measure_uuid, data.measured_value, customerCode)

    preparedStatement.run();
}


function confirmReadingValue(data: ConfirmData) {
    const preparedStatement = connection.prepare("update measures set has_confirmed = 1, measure_value = ? where measure_uuid = ?")
    const result: RunResult = preparedStatement.run(data.confirmed_value, data.measure_uuid);

    return result.changes == 1;
}


function getMeasuresForCustomer(customerCode: string, type: string | undefined) {

    const statement = "select m.image_url, m.measure_datetime, m.has_confirmed, m.measure_type, m.measure_uuid from measures m inner join customer c on c.customer_code = ?";

    if (type == undefined) {
        const preparedStatement = connection.prepare(statement);
        return preparedStatement.all(customerCode);
    }

    const preparedStatement = connection.prepare("select m.image_url, m.measure_datetime, m.has_confirmed, m.measure_type, m.measure_uuid from measures m inner join customer c on c.customer_code = ? where m.measure_type = ?")
    return preparedStatement.all(customerCode, type);
}

function isMeasureConfirmed(uuid: string) {
    const preparedStatement = connection.prepare("select has_confirmed from measures where measure_uuid = ? limit 1")
    const result = preparedStatement.all(uuid);

    return (<any>result[0]).has_confirmed == 1
}

function measureExistsByDatetime(datetime: Date): boolean {
    const preparedStatement = connection.prepare("select id from measures where strftime('%m%Y',measure_datetime) = strftime('%m%Y', ?) limit 1")
    const result = preparedStatement.all(datetime.toISOString());

    return result.length > 0;
}

function measureExistsByUUID(uuid: string) {
    const preparedStatement = connection.prepare("select id from measures where measure_uuid = ? limit 1")
    const result = preparedStatement.all(uuid);

    return result.length > 0;
}




export default {
    bootstrap,  //Initializer

    addMeasure,
    confirmReadingValue,
    getMeasuresForCustomer,
    isMeasureConfirmed,
    measureExistsByDatetime,
    measureExistsByUUID
}