type UploadData = {
    image: string,
    customer_code: string,
    measure_datetime: Date,
    measure_type: "WATER" | "GAS";
}

type MeasureData = {
    image_url: string,
    upload_name: string,
    has_confirmed: boolean,
    measure_datetime: Date,
    measure_type: "WATER" | "GAS";
    measure_uuid: string
}

export { UploadData, MeasureData }