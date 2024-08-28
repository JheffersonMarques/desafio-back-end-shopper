import { Express, Request as Req, Response as Res } from 'express';
import { Gemini, GeminiFileManager } from '..';
import fs from 'fs';
import customer_dao from '../dao/customer_dao';
import measure_dao from '../dao/measure_dao';
import { UploadData } from '../type';


function uploadDataValidador(data: any): [string, Boolean] {
    // Type validation
    if (typeof data.image != 'string') return [`Invalid Image, expected string, got ${typeof data.image}`, false];
    if (typeof data.customer_code != 'string') return [`Invalid Customer Code, expected string, got ${typeof data.customer_code}`, false];
    if (typeof data.measure_datetime != 'string') return [`Invalid Measure Datetime, expected string, got ${typeof data.measure_datetime}`, false];
    if (!["WATER", "GAS"].includes(data.measure_type)) return [`Invalid Measure Type, expected "WATER" | "GAS", got ${data.measure_type}`, false]


    return ["Valid", true];
}

async function downloadImage(imageData: string, fileName: string) {
    const buffer = await (await (await fetch(imageData)).blob()).bytes();
    fs.writeFileSync(fileName, buffer, { encoding: 'binary' });
}


class MeasureController {

    private async upload(req: Req, res: Res): Promise<void> {
        const data = req.body;
        try {
            const [msg, valid] = uploadDataValidador(data);
            if (valid) {
                const uploadData = data as UploadData;
                uploadData.measure_datetime = new Date(uploadData.measure_datetime);
                const name = `${uploadData.measure_datetime.getDay()}-${uploadData.measure_datetime.getMonth()}-${uploadData.measure_type}-${uploadData.customer_code}.png`;
                
                if(measure_dao.measureExist(uploadData.measure_datetime)){
                    res.status(409).send({
                        "error_code": "DOUBLE_REPORT",
                        "error_description": "Leitura do mês já realizada"
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
                        text: "Essa é uma conta, poderia retornar o valor a pagar em JSON como um campo nomeado 'value'?"
                    }
                ])

                console.log("Got Result")

                let resp = JSON.parse(result.response.text());
                let measure_uuid = crypto.randomUUID();

                measure_dao.addMeasure({
                    has_confirmed: false,
                    image_url: uploadReponse.file.uri,
                    measure_datetime: uploadData.measure_datetime,
                    upload_name: name,
                    measure_type: uploadData.measure_type,
                    measure_uuid: measure_uuid
                }, uploadData.customer_code)

                res.send({
                    "image_url": uploadReponse.file.uri,
                    "measure_value": resp.value,
                    "measure_uuid": measure_uuid
                });
            } else {
                throw msg;
            }
        } catch (e) {
            res.status(400).send({
                error_code: "INVALID_DATA",
                error_description: e,
            });
        }
    }

    private confirm(req: Req, res: Res): void {
        //TODO (patch)
    }

    private async listMeasuresByCustomer(req: Req, res: Res): Promise<void> {
        //TODO (get)
    }

    public map(express: Express): void {
        customer_dao.bootstrap();
        measure_dao.bootstrap();
        express.post("/upload", this.upload)
        express.patch("/confirm", this.confirm);
        express.get("/:userId/list", this.listMeasuresByCustomer)
    }
}


export default { 
    INSTANCE: new MeasureController()
};