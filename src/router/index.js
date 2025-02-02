import { createRouter, createWebHashHistory } from 'vue-router';
import InvoiceGenerator from '@/views/InvoiceGenerator.vue';
import InvoicePage from '@/views/InvoicePage.vue';
import EditCSV from '@/views/EditCSV.vue';

const routes = [
  {
    path: '/',
    redirect: '/invoice-generator'
  },
  {
    path: '/invoice-generator',
    name: 'Invoice Generator',
    component: InvoiceGenerator
  },
  {
    path: '/invoice-page',
    name: 'InvoicePage',
    component: InvoicePage
  },
  {
    path: '/edit-csv',
    name: 'EditCSV',
    component: EditCSV
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
