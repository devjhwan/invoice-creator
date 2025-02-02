<template>
  <div class="page">
    <h1>Edit Invoices</h1>

    <div v-if="loading" class="loading">
      Loading invoices...
    </div>

    <div v-else>
      <div
        v-for="(invoice, index) in invoicesList"
        :key="invoice.id"
        class="invoice-card"
      >
        <div class="card-header">
          <div class="basic-info">
            <span><strong>Invoice Number:</strong> {{ invoice.invoiceNumber }}</span>
            <span><strong>Date:</strong> {{ invoice.invoiceDate }}</span>
          </div>
          <div class="card-buttons">
            <button @click="toggleExpand(index)">
              {{ invoice.expanded ? 'Collapse' : 'Expand' }}
            </button>
            <button @click="deleteInvoice(index)" class="delete-btn">
              Delete
            </button>
          </div>
        </div>

        <div v-if="invoice.expanded" class="card-body">
          <div class="bill-info" v-if="invoice.billInfo">
            <p><strong>Company:</strong> {{ invoice.billInfo.companyName }}</p>
            <p><strong>VAT No.:</strong> {{ invoice.billInfo.vatNo }}</p>
            <p><strong>Street:</strong> {{ invoice.billInfo.street }}</p>
            <p><strong>City:</strong> {{ invoice.billInfo.city }}</p>
            <p><strong>Postal Code:</strong> {{ invoice.billInfo.postalCode }}</p>
            <p><strong>Country:</strong> {{ invoice.billInfo.country }}</p>
            <p><strong>Email:</strong> {{ invoice.billInfo.email }}</p>
          </div>

          <div class="items" v-if="invoice.items && invoice.items.length">
            <h4>Items</h4>
            <ul>
              <li v-for="(item, idx) in invoice.items" :key="idx">
                <span><strong>Description:</strong> {{ item.description }}</span>
                <span>
                  <strong>, Price:</strong> €{{ item.price.toFixed(2) }}
                </span>
                <span>
                  <strong>, Tax:</strong> €{{ item.tax.toFixed(2) }}
                </span>
                <span>
                  <strong>, Amount:</strong> €{{ item.amount.toFixed(2) }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 하단 버튼 -->
      <div class="buttons-container">
        <button class="cancel-btn" @click="cancelEdit">Cancel</button>
        <button class="save-btn" @click="saveEdits">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getInvoices, setInvoices } from '@/utils/firebaseHelper.js';

const router = useRouter();
const loading = ref(true);
const invoicesList = ref([]);

// 컴포넌트 마운트 시 Firebase에서 invoices 가져오기
onMounted(async () => {
  try {
    const invoicesData = await getInvoices();
    if (invoicesData) {
      // 객체를 배열로 변환하고 각 invoice에 로컬 상태 expanded 추가
      invoicesList.value = Object.entries(invoicesData).map(([id, data]) => ({
        id,
        ...data,
        expanded: false
      }));
    } else {
      invoicesList.value = [];
    }
  } catch (error) {
    console.error("Error fetching invoices:", error);
  } finally {
    loading.value = false;
  }
});

// 카드 확장/축소 토글
const toggleExpand = (index) => {
  invoicesList.value[index].expanded = !invoicesList.value[index].expanded;
};

// 카드 삭제
const deleteInvoice = (index) => {
  if (confirm("이 인보이스를 삭제하시겠습니까?")) {
    invoicesList.value.splice(index, 1);
  }
};

// Cancel 버튼: 변경사항 버리고 뒤로 이동
const cancelEdit = () => {
  if (confirm("뒤로 가시겠습니까? 진행 중인 모든 변경사항이 버려집니다.")) {
    router.back();
  }
};

// Save 버튼: 삭제되지 않은 인보이스를 Firebase에 저장
const saveEdits = async () => {
  // 배열을 객체로 변환 (각 invoice의 로컬 상태인 expanded 속성은 제외)
  const invoicesObject = {};
  invoicesList.value.forEach((invoice) => {
    const { expanded, id, ...data } = invoice;
    expanded;
    invoicesObject[id] = data;
  });
  try {
    await setInvoices(invoicesObject);
    alert("인보이스가 성공적으로 저장되었습니다.");
    router.back();
  } catch (error) {
    console.error("Error saving invoices:", error);
    alert("저장 중 오류가 발생했습니다. 다시 시도해 주세요.");
  }
};
</script>

<style scoped>
.page {
  padding: 20px;
}

.loading {
  text-align: center;
  font-size: 18px;
}

.invoice-card {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 15px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.basic-info span {
  display: inline-block;
  margin-right: 10px;
}

.card-buttons button {
  margin-left: 5px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}

.delete-btn {
  background-color: #ffcccc;
  border: 1px solid #ff8888;
  border-radius: 4px;
}

.card-body {
  margin-top: 10px;
  font-size: 14px;
}

.bill-info p,
.items li {
  margin: 4px 0;
}

.items ul {
  list-style-type: disc;
  padding-left: 20px;
}

.buttons-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.cancel-btn,
.save-btn {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}

.cancel-btn {
  background-color: #ffcc00;
  border: none;
  border-radius: 4px;
}

.save-btn {
  background-color: lightgreen;
  border: none;
  border-radius: 4px;
}
</style>
