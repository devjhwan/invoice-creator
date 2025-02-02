import { ref, push, get, set, remove, query, orderByChild, limitToFirst } from 'firebase/database';
import { database } from '@/firebase/firebaseConfig.js';

const CSV_FILE_NAME = 'invoices.csv';

/**
 * backupInvoice
 * - 매번 호출 시 'update-count' 값을 1씩 증가시킵니다.
 * - 'update-count'가 5의 배수일 때 Firebase의 "invoices" 데이터를 가져와,
 *   "invoice-backups" 경로에 백업을 저장합니다.
 * - 백업 개수는 "backup-count" 노드에 저장되어 있으며, 최대 15회로 제한됩니다.
 *   15회가 넘으면 새 백업 추가 전에 가장 오래된 백업을 삭제하고, 백업 개수를 업데이트합니다.
 */
export const backupInvoice = async () => {
  try {
    const db = database;

    // 1. update-count 가져오기 및 증가
    const updateCountRef = ref(db, "update-count");
    const updateCountSnapshot = await get(updateCountRef);
    let updateCount = updateCountSnapshot.exists() ? Number(updateCountSnapshot.val()) : 0;
    updateCount = (updateCount + 1) % 5; // 업데이트 횟수 증가
    await set(updateCountRef, updateCount);
    console.log("Update count:", updateCount);

    // 2. 5의 배수가 아니라면 백업하지 않음
    if (updateCount % 5 !== 0) {
      console.log("업데이트 횟수가 5의 배수가 아니므로 백업하지 않습니다.");
      return;
    }

    // 3. 현재 모든 invoices 데이터 가져오기
    const invoicesRef = ref(db, "invoices");
    const invoicesSnapshot = await get(invoicesRef);
    if (!invoicesSnapshot.exists()) {
      console.warn("백업할 인보이스 데이터가 없습니다.");
      return;
    }
    const invoicesData = invoicesSnapshot.val();

    // 4. 기존 백업 갯수 가져오기 (전체 백업 데이터를 가져오지 않고 별도 노드 "backup-count" 사용)
    const backupCountRef = ref(db, "backup-count");
    const backupCountSnapshot = await get(backupCountRef);
    let backupCount = backupCountSnapshot.exists() ? Number(backupCountSnapshot.val()) : 0;

    // 5. 백업 개수가 15회 이상이면 가장 오래된 백업 삭제
    if (backupCount >= 15) {
      // "invoice-backups" 경로에서 timestamp를 기준으로 오름차순 정렬하여 가장 오래된 백업 1개만 조회
      const oldestQuery = query(ref(db, "invoice-backups"), orderByChild("timestamp"), limitToFirst(1));
      const oldestSnapshot = await get(oldestQuery);
      if (oldestSnapshot.exists()) {
        const oldestBackups = oldestSnapshot.val(); // { backupKey: { timestamp, invoices } }
        const oldestKey = Object.keys(oldestBackups)[0];
        await remove(ref(db, `invoice-backups/${oldestKey}`));
        backupCount--; // 백업 카운트 감소
        await set(backupCountRef, backupCount);
        console.log("가장 오래된 백업 삭제:", oldestKey);
      }
    }

    // 6. 새로운 백업 데이터 생성 (백업 시각과 함께 invoices 데이터를 저장)
    const backupData = {
      timestamp: Date.now(),
      invoices: invoicesData
    };
    const backupsRef = ref(db, "invoice-backups");
    const newBackupRef = await push(backupsRef, backupData);
    console.log("새 백업 생성 완료. 백업 키:", newBackupRef.key);

    // 7. 백업 카운트 증가 및 업데이트
    backupCount++;
    await set(backupCountRef, backupCount);
    console.log("현재 백업 개수:", backupCount);
  } catch (error) {
    console.error("backupInvoice 처리 중 오류 발생:", error);
    throw error;
  }
};

/**
 * pushInvoice
 * - invoiceData 객체를 받아, invoiceModified, showBillSection, 각 아이템의 expanded 속성을 제외한 후,
 *   Firebase Realtime Database의 "invoices" 경로에 저장(푸시)합니다.
 * - 저장 경로: "invoices" 컬렉션 밑에 자동 생성된 key로 저장됩니다.
 */
export const pushInvoice = async (invoiceData) => {
  try {
    // invoiceData에서 제외할 속성을 제거한 새로운 객체 생성
    const filteredInvoiceData = {
      // 필요에 따라 추가적으로 포함할 속성이 있다면 여기에 명시
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate,
      billInfo: invoiceData.billInfo, // billInfo 내부의 내용은 그대로 저장
      // items 배열에서 각 아이템의 expanded 속성을 제거
      items: invoiceData.items ? invoiceData.items.map(item => {
        const { expanded, ...rest } = item;
        expanded;
        return rest;
      }) : []
    };

    const db = database; // 이미 초기화된 database 인스턴스 사용
    const invoicesRef = ref(db, 'invoices');
    const newInvoiceRef = await push(invoicesRef, filteredInvoiceData);
    console.log("Invoice pushed with key:", newInvoiceRef.key);
    await backupInvoice();
    return newInvoiceRef.key;
  } catch (error) {
    console.error("Error pushing invoice:", error);
    throw error;
  }
};

/**
 * setInvoices
 * - 전달된 invoices 객체를 Firebase Realtime Database의 "invoices" 경로에 저장합니다.
 * - invoices 객체가 빈 객체인 경우 에러를 발생시킵니다.
 *
 * @param {Object} invoices - 인보이스 데이터를 포함하는 객체 (예: { invoiceId1: {...}, invoiceId2: {...}, ... })
 */
export const setInvoices = async (invoices = {}) => {
  try {
    // 빈 객체가 전달된 경우 에러 발생
    if (Object.keys(invoices).length === 0) {
      throw new Error("빈 객체가 전달되었습니다. 인보이스 데이터를 확인하세요.");
    }
    
    const db = database;
    const invoicesRef = ref(db, 'invoices');
    await set(invoicesRef, invoices);
    console.log("Invoices have been set:", invoices);
    await backupInvoice();
  } catch (error) {
    console.error("Error setting invoices:", error);
    throw error;
  }
};

/**
 * getInvoice
 * - Firebase Realtime Database의 "invoices" 경로에서 invoice 데이터를 가져와 반환합니다.
 * - 여러 개의 invoice가 저장되어 있을 경우, 객체 형태(각 key가 invoice id)가 반환됩니다.
 */
export const getInvoices = async () => {
  try {
    const db = database;
    const invoicesRef = ref(db, 'invoices');
    const snapshot = await get(invoicesRef);
    if (snapshot.exists()) {
      console.log("Invoices retrieved:", snapshot.val());
      return snapshot.val();
    } else {
      console.warn("No invoice data available");
      return null;
    }
  } catch (error) {
    console.error("Error retrieving invoice data:", error);
    throw error;
  }
};

/**
 * json2CSV
 * - 여러 invoice 데이터(객체)를 CSV 문자열로 변환합니다.
 * - invoiceData의 구조는 다음과 같습니다:
 *    {
 *      invoiceNumber: ...,
 *      invoiceDate: ...,
 *      billInfo: { companyName, vatNo, street, city, postalCode, country, email },
 *      items: [
 *         { description, price, tax, amount },
 *         ...
 *      ]
 *    }
 * - 만약 getInvoice()로 반환된 데이터가 여러 invoice를 담은 객체라면,
 *   Object.values()를 사용하여 배열로 변환한 후 처리합니다.
 */
const json2CSV = (jsonInvoiceData) => {
  // CSV 헤더
  const header = [
    "Invoice Number", "Invoice Date", "Company", "VAT No.", "Address", "City", "Postal Code", "Country", "Email",
    "Description", "Price", "Tax", "Amount"
  ];
  
  let csvString = "\uFEFF" + header.join(",") + "\n"; // UTF-8 BOM 포함

  // jsonInvoiceData가 배열가 아니라면, 객체의 값들로 변환
  const invoicesArray = Array.isArray(jsonInvoiceData)
    ? jsonInvoiceData
    : jsonInvoiceData
      ? Object.values(jsonInvoiceData)
      : [];
  
  invoicesArray.forEach(invoiceData => {
    if (invoiceData.items && Array.isArray(invoiceData.items)) {
      invoiceData.items.forEach(item => {
        const row = [
          invoiceData.invoiceNumber,
          invoiceData.invoiceDate,
          invoiceData.billInfo?.companyName || "",
          invoiceData.billInfo?.vatNo || "",
          invoiceData.billInfo?.street || "",
          invoiceData.billInfo?.city || "",
          invoiceData.billInfo?.postalCode || "",
          invoiceData.billInfo?.country || "",
          invoiceData.billInfo?.email || "",
          item.description,
          item.price.toFixed(2),
          item.tax.toFixed(2),
          item.amount.toFixed(2)
        ];
        csvString += row.join(",") + "\n";
      });
    }
  });

  return csvString;
};

/**
 * downloadCSVFile
 * - Firebase Realtime Database에서 invoice 데이터를 가져와 CSV 형식으로 변환한 후,
 *   Blob을 생성하여 브라우저에서 다운로드를 트리거합니다.
 */
export const downloadCSVFile = async () => {
  try {
    const invoicesData = await getInvoices();
    if (!invoicesData) {
      throw new Error("No invoice data found in database.");
    }
    // JSON 데이터를 CSV 문자열로 변환
    const csvData = json2CSV(invoicesData);
    // CSV 데이터를 담은 Blob 생성 (MIME 타입: text/csv)
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    // Blob URL 생성
    const url = URL.createObjectURL(blob);
    
    // 임시 <a> 엘리먼트 생성하여 다운로드 트리거
    const a = document.createElement('a');
    a.href = url;
    a.download = CSV_FILE_NAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 생성한 URL 해제
    URL.revokeObjectURL(url);

    console.log('✅ CSV 파일 다운로드 시작:', CSV_FILE_NAME);
    return CSV_FILE_NAME;
  } catch (error) {
    console.error('❌ CSV 파일 다운로드 실패:', error);
    throw error;
  }
};

/**
 * getInvoiceNumber
 * - Firebase Realtime Database의 'invoiceNumber' 경로에서 현재 invoice 번호를 읽어옵니다.
 * - 만약 값이 존재하지 않으면 기본값(예: 1001)을 반환합니다.
 */
export const getInvoiceNumber = async () => {
  try {
    const invoiceRef = ref(database, 'invoiceNumber');
    const snapshot = await get(invoiceRef);
    if (snapshot.exists()) {
      // 값이 string일 경우 Number로 변환합니다.
      return Number(snapshot.val());
    } else {
      // 값이 없으면 기본값을 반환 (예: 1001)
      return 1001;
    }
  } catch (error) {
    console.error("Error getting invoice number:", error);
    throw error;
  }
};

/**
 * incrementInvoiceNumber
 * - 현재 invoice 번호를 가져와 1을 증가시킨 후 Firebase에 업데이트합니다.
 * - 업데이트 후 새로운 invoice 번호를 반환합니다.
 */
export const incrementInvoiceNumber = async () => {
  try {
    const currentNumber = await getInvoiceNumber();
    const newNumber = currentNumber + 1;
    const invoiceRef = ref(database, 'invoiceNumber');
    await set(invoiceRef, newNumber);
    console.log(`Invoice number incremented: ${currentNumber} → ${newNumber}`);
    return newNumber;
  } catch (error) {
    console.error("Error incrementing invoice number:", error);
    throw error;
  }
};
