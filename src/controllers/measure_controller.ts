import { Express, Request as Req, Response as Res } from 'express';
import { Gemini, GeminiFileManager } from '..';
import fs from 'fs';
import customer_dao from '../dao/customer_dao';
import measure_dao from '../dao/measure_dao';
import { ConfirmData, ErrorCode, ErrorMessage, MeasureType, UploadData } from '../type';


function uploadDataValidador(data: any): [string, Boolean] {
    // Type validation
    if (typeof data.image != 'string') return [`Invalid Image, expected string, got ${typeof data.image}`, false];
    if (typeof data.customer_code != 'string') return [`Invalid Customer Code, expected string, got ${typeof data.customer_code}`, false];
    if (typeof data.measure_datetime != 'string') return [`Invalid Measure Datetime, expected string, got ${typeof data.measure_datetime}`, false];
    if (!["WATER", "GAS"].includes(data.measure_type)) return [`Invalid Measure Type, expected "WATER" | "GAS", got ${data.measure_type}`, false]


    return ["Valid", true];
}

function confirmationDataValidator(data: any): [string, Boolean] {
    if (typeof data.measure_uuid != 'string') return [`Invalid Measure UUID, expected to be string, got ${typeof data.measure_uuid}`, false]
    if (typeof data.confirmed_value != 'number') return [`Invalid Confirmed Value, expected an Integer, got ${typeof data.confirmed_value}`, false]

    return ["Valid", true]
}

async function downloadImage(imageData: string, fileName: string) {
    const buffer = await (await (await fetch(imageData)).blob()).bytes();
    fs.writeFileSync(fileName, buffer, { encoding: 'binary' });
}


class MeasureController {

    private async upload(req: Req, res: Res): Promise<void> {
        const data = req.body;
        const [msg, valid] = uploadDataValidador(data);
        if (valid) {
            const uploadData = data as UploadData;
            uploadData.measure_datetime = new Date(uploadData.measure_datetime);
            const name = `${uploadData.measure_datetime.getDay()}-${uploadData.measure_datetime.getMonth()}-${uploadData.measure_type}-${uploadData.customer_code}.png`;

            if (measure_dao.measureExistsByDatetime(uploadData.measure_datetime)) {
                res.status(409).send(<ErrorMessage>{
                    error_code: 'DOUBLE_REPORT',
                    error_description: "Leitura do mês já realizada"
                })
                return;
            }


            await downloadImage(uploadData.image, name);
            const uploadReponse = await GeminiFileManager.uploadFile(name, {
                mimeType: "image/png",
                displayName: name
            })


            fs.rmSync(name);

            const model = Gemini.getGenerativeModel({
                model: "gemini-1.5-pro",
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })

            const result = await model.generateContent([
                {
                    fileData: {
                        mimeType: uploadReponse.file.mimeType,
                        fileUri: uploadReponse.file.uri
                    }
                },
                {
                    text: "Esse é um hidrometro, poderia retornar o consumo em um campo 'value' como JSON?"
                }
            ])

            let resp = JSON.parse(result.response.text());
            let measure_uuid = crypto.randomUUID();

            let value = parseInt(resp.value);

            measure_dao.addMeasure({
                measured_value: value,
                has_confirmed: false,
                image_url: uploadReponse.file.uri,
                measure_datetime: uploadData.measure_datetime,
                upload_name: name,
                measure_type: uploadData.measure_type,
                measure_uuid: measure_uuid
            }, uploadData.customer_code)

            res.send({
                "image_url": uploadReponse.file.uri,
                "measure_value": value,
                "measure_uuid": measure_uuid
            });
        } else {
            res.status(400).send(<ErrorMessage>{
                error_code: 'INVALID_DATA',
                error_description: msg,
            });
        }
    }

    private confirm(req: Req, res: Res): void {
        const data = req.body;
        const [msg, valid] = confirmationDataValidator(data);
        if (valid) {
            const confirmData = data as ConfirmData;
            if(!measure_dao.measureExistsByUUID(confirmData.measure_uuid)){
                res.status(404).send(<ErrorMessage>{
                    error_code: 'MEASURE_NOT_FOUND',
                    error_description: "Leitura não encontrada"
                })
                return;
            }

            if(measure_dao.isMeasureConfirmed(confirmData.measure_uuid)){
                res.status(409).send(<ErrorMessage>{
                    error_code: 'CONFIRMATION_DUPLICATE',
                    error_description: "O valor dessa leitura já foi confirmado"
                })

                return;
            }
            
            if(measure_dao.confirmReadingValue(confirmData)){
                res.send({
                    success: true
                });
            }

        } else {
            res.status(400).send(<ErrorMessage>{
                error_code: "INVALID_DATA",
                error_description: msg,
            });
        }
    }

    private async listMeasuresByCustomer(req: Req, res: Res): Promise<void> {
        const measureType = req.query.measure_type;
        const customerCode = req.params.customer_code;
        if(measureType != undefined){
            if(!["WATER","GAS"].includes(<string>measureType )) {
                res.status(400).send(<ErrorMessage>{
                    error_code: "INVALID_TYPE",
                    error_description: "Tipo de medição não permitida",
                });
                return;
            }
        }

        const measures: Array<any> = measure_dao.getMeasuresForCustomer(customerCode,<string | undefined> measureType)
        
        if(measures.length == 0){
            res.status(404).send(<ErrorMessage>{
                error_code: "MEASURES_NOT_FOUND",
                error_description: "Nenhuma leitura encontrada",
            });
            return;
        }

        measures.map((measure) => measure.has_confirmed = measure.has_confirmed == 1 ? true : false);

        res.send({
            customer_code: customerCode,
            measures: measures
        })
    }

    public map(express: Express): void {
        customer_dao.bootstrap();
        measure_dao.bootstrap();
        express.post("/upload", this.upload)
        express.patch("/confirm", this.confirm);
        express.get("/:customer_code/list", this.listMeasuresByCustomer)
    }
}


export default {
    INSTANCE: new MeasureController()
};