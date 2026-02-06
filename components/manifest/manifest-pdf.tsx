import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Dispatch } from '@/lib/types/database';
import { formatCurrency, formatDate } from '@/lib/utils/format';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
    padding: 6,
  },
  table: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    paddingVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2 solid #000',
    paddingVertical: 8,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  col1: { width: '8%' },
  col2: { width: '20%' },
  col3: { width: '15%' },
  col4: { width: '20%' },
  col5: { width: '15%' },
  col6: { width: '22%' },
  summary: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#666',
    fontSize: 8,
  },
});

interface ManifestPDFProps {
  dispatches: Dispatch[];
  date: string;
}

export function ManifestPDF({ dispatches, date }: ManifestPDFProps) {
  // Group by payment mode
  const codDispatches = dispatches.filter(d => d.payment_mode === 'COD');
  const prepaidDispatches = dispatches.filter(d => d.payment_mode === 'Prepaid');

  const codTotal = codDispatches.reduce((sum, d) => sum + Number(d.amount), 0);
  const prepaidTotal = prepaidDispatches.reduce((sum, d) => sum + Number(d.amount), 0);
  const grandTotal = codTotal + prepaidTotal;

  const renderTable = (items: Dispatch[]) => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.col1}>#</Text>
        <Text style={styles.col2}>Customer</Text>
        <Text style={styles.col3}>Phone</Text>
        <Text style={styles.col4}>Tracking ID</Text>
        <Text style={styles.col5}>Amount</Text>
        <Text style={styles.col6}>Order ID</Text>
      </View>
      {items.map((dispatch, index) => (
        <View key={dispatch.id} style={styles.tableRow}>
          <Text style={styles.col1}>{index + 1}</Text>
          <Text style={styles.col2}>{dispatch.customer_name}</Text>
          <Text style={styles.col3}>{dispatch.phone_number}</Text>
          <Text style={styles.col4}>{dispatch.tracking_id}</Text>
          <Text style={styles.col5}>{formatCurrency(Number(dispatch.amount))}</Text>
          <Text style={styles.col6}>{dispatch.order_id}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Dispatch Manifest</Text>
          <Text style={styles.subtitle}>
            Date: {formatDate(date)} | Total Dispatches: {dispatches.length}
          </Text>
        </View>

        {codDispatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Cash on Delivery (COD) - {codDispatches.length} items
            </Text>
            {renderTable(codDispatches)}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>COD Total:</Text>
                <Text>{formatCurrency(codTotal)}</Text>
              </View>
            </View>
          </View>
        )}

        {prepaidDispatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Prepaid - {prepaidDispatches.length} items
            </Text>
            {renderTable(prepaidDispatches)}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Prepaid Total:</Text>
                <Text>{formatCurrency(prepaidTotal)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontSize: 12 }]}>Grand Total:</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
              {formatCurrency(grandTotal)}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Generated on {formatDate(new Date().toISOString())} at {new Date().toLocaleTimeString()}
        </Text>
      </Page>
    </Document>
  );
}
