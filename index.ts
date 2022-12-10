import request from "request";
import _ from "lodash";
import log from "./log";

/**
 * 저장할 파일명
 */
const filename = "./query2.sql";

const serviceKey = ``;

const len = 100;
const init = 501;
const maxId = 600;
let id = init;

if (!serviceKey) log("Error", "red", "서비스 키를 넣어주세요. Please insert serviceKey.");
else {
  const fs = require("fs");
  type mapType = Map<string, string | {} | null>;
  const validationValue = (txt: string) =>
    txt
      .replace(/\n/g, "")
      .replace(/\r/g, "")
      .replace(/<sub>/g, "")
      .replace(/<sup>/g, "")
      .replace(/<\/sub>/g, "")
      .replace(/<\/sup>/g, "")
      .replace(/<tbody>/g, "")
      .replace(/<\/tbody>/g, "")
      .replace(/<p>/g, "")
      .replace(/<\/p>/g, "")
      .replace(/<td>/g, "")
      .replace(/<\/td>/g, "")
      .replace(/<tr>/g, "")
      .replace(/<\/tr>/g, "")
      .replace(/<p .*>/g, "")
      .replace(/<td .*>/g, "")
      .replace(/&nbsp;/g, "")
      .replace(/<!--.*-->/g, "")
      .trim();

  const getDescription = (body: string, cb: (map: mapType) => void) => {
    _.map(body, async (medicineData: any, index: number) => {
      const map: mapType = new Map();
      map.set("api_page_no", id);

      await _.map(medicineData, (medicine: any, key: any) => {
        const v = medicine[0];
        if (typeof v === "string") {
          if (key === "MATERIAL_NAME") {
            const json: any = {};
            v.split("|").map((text) => {
              const t = text.split(" : ");
              const title = t[0];
              const desc = t[1];
              json[title] = desc ? validationValue(desc) : null;
            });
            map.set(key, json);
            // log("value", "gray", json);
          } else {
            const t = validationValue(v);
            // if (key === "ITEM_SEQ") log("key", "red", t ? t + " : " + (index + 1) : "null");
            map.set(key, t ? t : null);
            // log("value", "gray", v);
          }
        } else {
          let i = 0;
          _.map(v, (v2, k2) => {
            const title1 = v2[0]["$"].title; //k2
            // log("상세", "green", title1);
            if (v2[0].SECTION && v2[0].SECTION[0])
              _.map(v2[0].SECTION[0].ARTICLE, (v3, k3) => {
                const list: any[] = [];
                i++;
                const title3 = validationValue(v3["$"].title); //k2
                // log("상세 설명" + i, "cyan", title3);
                _.map(v3["PARAGRAPH"], (v4) => {
                  // log("de", "gray", v4["_"]);
                  list.push(v4["_"] ? validationValue(v4["_"]) : "null");
                });
                map.set("DESC" + i, { title: title1, subtitle: title3, list });
              });
          });
        }
      });
      cb(map);
    });
  };
  const getProduct = (id: number) => {
    return new Promise((resolve) => {
      request(
        `http://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService02/getDrugPrdtPrmsnDtlInq01?serviceKey=${serviceKey}&type=xml&numOfRows=${len}&pageNo=${id}`,
        (error: any, response: any, body: string) => {
          const { parseString } = require("xml2js");
          parseString(body, async (err: any, result: any) => {
            const cb = async (map: mapType) => {
              try {
                writeQuery(await insertForm(map, id)).then(resolve);
              } catch (error) {
                console.error(error);
              }
            };
            getDescription(result.response.body[0].items[0].item, cb);
            resolve(1);
          });
        }
      );
    });
  };

  const getQuery = (columnList: string, valueList: string, id: number) =>
    `INSERT IGNORE INTO F_DAYWORKS.medicine_apis_data_go_kr (api_page_no, ${columnList.slice(
      2
    )}) values (${id}, ${valueList.slice(2)});\n`;
  const getQueryDesc = (ITEM_SEQ: string | null, title: string, subtitle: string, description: string, index: number) =>
    `INSERT IGNORE INTO F_DAYWORKS.medicine_apis_data_go_kr_detail (medicine_id, title, subtitle, description, \`index\`) 
VALUES((select id  from medicine_apis_data_go_kr where ITEM_SEQ=${ITEM_SEQ}),${
      title ? validationValue(`'${title}'`) : null
    }, ${subtitle ? validationValue(`'${subtitle}'`) : null},  ${
      description ? validationValue(`'${description}'`) : null
    }, ${index});\n`;
  const writeQuery = async (content: string) => await fs.writeFileSync(filename, content, { flag: "a+" });
  const insertForm = async (map: mapType, id: number) => {
    let columnList = ``;
    let valueList = ``;
    let descString = ``;
    let descIndex = 0;
    let ITEM_SEQ: string | null = "";
    await map.forEach((v: any, k) => {
      descIndex++; //1부터 시작.
      if (v === null || typeof v === "string" || typeof v["총량"] === "string") {
        if (k === "ITEM_SEQ") ITEM_SEQ = v;
        if (k === "MATERIAL_NAME") {
          columnList += `, material`;
          valueList += `, '${v["성분명"].replace(/'/g, `\\'`).replace(/\\"/g, `\\'`)}'`;
        }
        columnList += `, ${k}`;
        valueList += `, ${
          v === null
            ? null
            : typeof v === "string"
            ? `'${v.replace(/'/g, `\\'`).replace(/\\"/g, `\\'`)}'`
            : `'${JSON.stringify(v).replace(/'/g, `\\'`).replace(/\\"/g, `\\'`)}'`
        }`;
      } else if (v["title"]) {
        descString += getQueryDesc(
          ITEM_SEQ,
          v["title"],
          v["subtitle"],
          Array(v["list"]).join("||").replace(/'/g, `\\'`).replace(/\\"/g, `\\'`),
          descIndex
        );
      }
    });
    return getQuery(columnList, valueList, id) + descString;
  };
  //#endregion

  const exceptList: number[] = [];

  const wrapSlept = async (sec: number) => await new Promise((resolve) => setTimeout(resolve, sec));
  const f = async () => {
    //동작
    while (id <= maxId) {
      if (!exceptList.includes(id)) {
        log("api_page_no", "blue", String(id));
        getProduct(id);
        await wrapSlept(2000);
      }
      id++;
    }
    console.log("Done!");
  };
  f();
}
const TableDDL1 = `
CREATE TABLE \`medicine_apis_data_go_kr\` (
  \`id\` bigint NOT NULL AUTO_INCREMENT,
  \`api_page_no\` int NOT NULL COMMENT '페이지번호(100개씩가져옴)',
  \`ITEM_SEQ\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '품목기준코드',
  \`ITEM_NAME\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '품목명',
  \`ENTP_NAME\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '업체명',
  \`material\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'MATERIAL_NAME에서 추출해낸 성분명',
  \`ITEM_PERMIT_DATE\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '허가일자',
  \`CNSGN_MANUF\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '위탁제조업체',
  \`ETC_OTC_CODE\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '전문일반',
  \`CHART\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '성상',
  \`BAR_CODE\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '표준코드',
  \`MATERIAL_NAME\` json DEFAULT NULL COMMENT '원료성분',
  \`EE_DOC_ID\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '효능효과',
  \`UD_DOC_ID\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '용법용량',
  \`NB_DOC_ID\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '주의사항',
  \`INSERT_FILE\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '첨부문서',
  \`STORAGE_METHOD\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '저장방법',
  \`VALID_TERM\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '유효기간',
  \`REEXAM_TARGET\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '재심사대상',
  \`REEXAM_DATE\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '재심사기간',
  \`PACK_UNIT\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '포장단위',
  \`EDI_CODE\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '보험코드',
  \`DOC_TEXT\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '제조방법',
  \`PERMIT_KIND_NAME\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '허가/신고구분',
  \`ENTP_NO\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '업체허가번호',
  \`MAKE_MATERIAL_FLAG\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '완제/원료구분',
  \`NEWDRUG_CLASS_NAME\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '신약',
  \`INDUTY_TYPE\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '업종구분(의약품/의약외품/의약품및의약외품수입업/화장품/의약외품수입업/수입품/마약류제조업자/마약류수출입업자/마약류원료사용자/마약류학술연구자/마약류도매업자/마약류소매업자/의료업자/마약류관리자/마약류취급자/의약품위탁제조판매/원료물질수출업자/원료물질수입업자/임상시험수탁기관,협회/임상연구자,의사등/임상시험계획승인을받은자/화장품제조/화장품제조판매/원료물질제조업자/연구자개인(책임연구자)/연구자학회등/국내제약사/국내임상시험수탁기관/국내기타/다국적제약사/다국적임상시험수',
  \`CANCEL_DATE\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '취소일자',
  \`CANCEL_NAME\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '상태',
  \`CHANGE_DATE\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '변경일자',
  \`NARCOTIC_KIND_CODE\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '마약종류코드',
  \`GBN_NAME\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '변경이력',
  \`TOTAL_CONTENT\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '총량',
  \`PN_DOC_DATA\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '주의사항(전문) 문서 데이터',
  \`MAIN_ITEM_INGR\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '유효성분',
  \`INGR_NAME\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '첨가제',
  \`ATC_CODE\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'ATC코드',
  \`UD_DOC_DATA\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '용법용량 문서 데이터',
  \`EE_DOC_DATA\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '효능효과 문서 데이터',
  \`NB_DOC_DATA\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '주의사항(일반) 문서 데이터',
  \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
  \`modified_at\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`medicine_apis_data_go_kr_UN\` (\`ITEM_SEQ\`,\`ITEM_NAME\`,\`ENTP_NAME\`)
) ENGINE=InnoDB AUTO_INCREMENT=98078 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='공공데이터 포털. https://www.data.go.kr/ 의 의약품 데이터 https://www.data.go.kr/data/15095677/openapi.do.';`;
const TableDDL2 = `
CREATE TABLE \`medicine_apis_data_go_kr_detail\` (
  \`detail_id\` int NOT NULL AUTO_INCREMENT,
  \`medicine_id\` int NOT NULL,
  \`title\` varchar(100) DEFAULT NULL,
  \`subtitle\` text,
  \`description\` longtext,
  \`index\` int DEFAULT NULL COMMENT '해당 약의 상세설명 번호',
  PRIMARY KEY (\`detail_id\`),
  UNIQUE KEY \`medicine_apis_data_go_kr_detail_UN\` (\`medicine_id\`,\`index\`)
) ENGINE=InnoDB AUTO_INCREMENT=546074 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='medicine_apis_data_go_kr에 들어가는 사용법 및 주의사항 상세 설명';`;
