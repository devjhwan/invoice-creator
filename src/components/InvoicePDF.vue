<template>
  <div id="pdf-region" class="invoice-container">
    <!-- 제목 -->
    <h1 class="title">BUSINESS INVOICE</h1>

    <!-- Invoice 정보 -->
    <div class="invoice-info">
      <div class="row">
        <label><strong>Invoice Number:</strong></label>
        <p>{{ invoiceData.invoiceNumber }}</p>
      </div>
      <div class="row">
        <label><strong>Invoice Date:</strong></label>
        <p>{{ invoiceData.invoiceDate }}</p>
      </div>
    </div>

    <!-- 발신자 & 수신자 정보 -->
    <div class="billing-section">
      <div class="from">
        <h3>From:</h3>
        <p><strong>Balnedia Barcelona S.L</strong></p>
        <p>VAT No.: B10785210</p>
        <p>Carrer de Portbou, 17, 1er</p>
        <p>Barcelona, Spain, 08028</p>
        <p>Email: balnedia@gmail.com</p>
      </div>
      
      <div class="bill-to" v-if="invoiceData.showBillSection">
        <h3>Bill To:</h3>
        <p><strong>{{ invoiceData.billInfo.companyName }}</strong></p>
        <p>VAT No.: {{ invoiceData.billInfo.vatNo }}</p>
        <p>{{ invoiceData.billInfo.street }}, {{ invoiceData.billInfo.city }}</p>
        <p>{{ invoiceData.billInfo.postalCode }}, {{ invoiceData.billInfo.country }}</p>
        <p>Email: {{ invoiceData.billInfo.email }}</p>
      </div>
    </div>

    <!-- 상품 내역 테이블 -->
    <table class="invoice-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Price (€)</th>
          <th>Tax (€)</th>
          <th>Total Amount (€)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in invoiceData.items" :key="index">
          <td>{{ item.description }}</td>
          <td>€{{ item.price.toFixed(2) }}</td>
          <td>€{{ item.tax.toFixed(2) }}</td>
          <td>€{{ item.amount.toFixed(2) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- 총 금액 -->
    <div class="total-section">
      <p><strong>Tax Rate:</strong> 21%</p>
      <h2><strong>Total:</strong> €{{ totalAmount }}</h2>
    </div>

    <!-- 하단 고정 정보 -->
    <div class="footer">
      <div class="informations">
        <div class="paiment-instructions">
          <h3>Payment Instructions:</h3>
          <p><strong>Bank Name:</strong> Caixa Bank</p>
          <p><strong>Account Name:</strong> Balnedia Barcelona S.L.</p>
          <p><strong>Account Number:</strong> ES4321000704110200174683</p>
        </div>
        
        <div class="terms-and-conditions">
          <h3>Terms and Conditions:</h3>
          <p>Payment is due within 30 days of the invoice date. Late payments may be subject to a 5% late fee.</p>
        </div>
      </div>
      
      <p class="thank-you">
        Thank you for your prompt payment. If you have any questions regarding this invoice or need further assistance, please don't hesitate to contact us.
      </p>
    </div>
  </div>
</template>

<script setup>
// eslint-disable-next-line no-undef
/* global defineExpose */

import { ref, computed, onMounted } from 'vue';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const invoiceData = ref({});

onMounted(() => {
  const storedData = sessionStorage.getItem("invoiceData");
  invoiceData.value = storedData ? JSON.parse(storedData) : {};
});

// 총 금액 계산
const totalAmount = computed(() => {
  if (!invoiceData.value.items) return "0.00";
  return invoiceData.value.items
    .reduce((sum, item) => sum + (item.amount || 0), 0)
    .toFixed(2);
});

// PDF 변환 함수
const generatePDF = async () => {
  try {
    const invoiceElement = document.querySelector("#pdf-region");

    if (!invoiceElement) {
      alert("Error: Invoice content not found.");
      return;
    }

    // A4 사이즈 (픽셀 기준: 794 × 1123)
    const A4_WIDTH_PX = 794;
    const A4_HEIGHT_PX = 1123;

    // 기존 스타일 백업 (나중에 복원하기 위해)
    const originalStyle = {
      width: invoiceElement.style.width,
      height: invoiceElement.style.height,
      transform: invoiceElement.style.transform,
    };

    // A4 크기에 맞게 요소 스타일 조정
    invoiceElement.style.width = `${A4_WIDTH_PX}px`;
    invoiceElement.style.height = `${A4_HEIGHT_PX}px`;
    invoiceElement.style.transform = "scale(1)";

    // html2canvas로 캡처 (A4 크기로 조정된 상태)
    const canvas = await html2canvas(invoiceElement, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    // PDF 생성 (A4 크기)
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297);

    // 원래 스타일 복원
    invoiceElement.style.width = originalStyle.width;
    invoiceElement.style.height = originalStyle.height;
    invoiceElement.style.transform = originalStyle.transform;

    return pdf;
  } catch (error) {
    console.error("PDF 생성 중 오류 발생:", error);
    alert("An error occurred while generating the PDF.");
  }
};

// 기존 sendEmail 함수의 역할을 다운로드로 변경하여 downloadPDF 함수로 이름 변경
const downloadPDF = async () => {
  try {
    console.log("PDF 생성 시작...");
    const pdf = await generatePDF();
    if (!pdf) {
      alert("Failed to generate PDF.");
      return;
    }
    const fileName = `invoice_${new Date().getTime()}.pdf`;
    // PDF 다운로드 (브라우저에서 저장)
    pdf.save(fileName);
    console.log("PDF 다운로드 완료!");
  } catch (error) {
    console.error("PDF 다운로드 중 오류 발생:", error);
    alert("An error occurred while generating or downloading the PDF.");
  }
};

// 새로운 sendEmail 함수: PDF 공유 기능 활성화
const sendEmail = async () => {
  try {
    console.log("PDF 생성 시작...");
    const pdf = await generatePDF();
    if (!pdf) {
      alert("Failed to generate PDF.");
      return;
    }
    const fileName = `invoice_${new Date().getTime()}.pdf`;
    // jsPDF에서 PDF를 Blob으로 출력 (최신 버전에서 지원)
    const blob = pdf.output("blob");
    // File 객체 생성 (Web Share API가 필요로 하는 형식)
    const file = new File([blob], fileName, { type: "application/pdf" });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Invoice PDF 공유",
        text: "Please see the attached invoice PDF.",
        files: [file],
      });
      console.log("PDF 공유 완료!");
    } else {
      console.log("Web Share API를 통한 파일 공유를 지원하지 않습니다. 대신 PDF를 다운로드합니다.");
      pdf.save(fileName);
    }
  } catch (error) {
    console.error("PDF 공유 중 오류 발생:", error);
    alert("An error occurred while sharing the PDF.");
  }
};

defineExpose({
  generatePDF,
  downloadPDF,
  sendEmail
});
</script>

<style scoped>
#pdf-region {
  width: 100%;
  height: auto;
}

.invoice-container {
  margin: auto;
  padding: 20px;
  background: #fff;
}

.title {
  text-align: center;
  font-size: 24px;
  margin-bottom: 20px;
}

.invoice-info {
  gap: 20px;
}

.invoice-info .row {
  display: flex;
  justify-content: flex-end;
}

.invoice-info .row label {
  width: 150px;
}

.invoice-info .row p {
  margin: 0;
  width: 100px;
}

.billing-section {
  display: flex;
  justify-content: flex-start;
  gap: 80px;
  margin-left: 20px;
}

.billing-section p {
  margin-top: 6px;
  margin-bottom: 6px;
}

.invoice-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.invoice-table th,
.invoice-table td {
  border: 1px solid #000;
  padding: 8px;
  text-align: left;
}

.total-section {
  text-align: right;
  margin-top: 20px;
}

.footer {
  margin-top: 30px;
  display: block;
}

.informations {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.paiment-instructions,
.terms-and-conditions {
  flex: 1;
  box-sizing: border-box;
}

.paiment-instructions p {
  margin-top: 2px;
  margin-bottom: 2px;
}
</style>
