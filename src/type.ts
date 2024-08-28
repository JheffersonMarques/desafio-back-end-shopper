type ErrorCode = 
    "INVALID_DATA" |
    "MEASURE_NOT_FOUND" |
    "CONFIRMATION_DUPLICATE" |
    "DOUBLE_REPORT" | 
    "INVALID_TYPE" | 
    "MEASURES_NOT_FOUND"

type ErrorMessage = {
    error_code: ErrorCode;
    error_description: any;
}


type MeasureType = "WATER" | "GAS";
type UploadData = {
    image: string,
    customer_code: string,
    measure_datetime: Date,
    measure_type: MeasureType;
}

type MeasureData = {
    image_url: string,
    measured_value: number
    upload_name: string,
    has_confirmed: boolean,
    measure_datetime: Date,
    measure_type: MeasureType;
    measure_uuid: string
}

type ConfirmData = {
    measure_uuid: string,
    confirmed_value: number
}

export { UploadData, MeasureData, MeasureType, ConfirmData, ErrorMessage, ErrorCode }