/**
 * NBSTR RMS v1.9 — Finance Bridge
 * RMS tracks workflow/reconciliation. QuickBooks Online remains accounting system of record.
 */
function ensureV19Tables_(){
  ensureTable_(SpreadsheetApp.getActive(),'FinanceTransactions',[
    'FinanceTransactionID','TransactionDate','TransactionType','PaymentProcessor',
    'ProcessorTransactionID','GrossAmount','ProcessorFee','NetAmount','PayerName',
    'PayerEmail','RelatedRecordType','RelatedRecordID','DogID','QuickBooksStatus',
    'QuickBooksReference','ReconciliationStatus','Notes','CreatedAt','CreatedByPersonID'
  ]);
  ensureTable_(SpreadsheetApp.getActive(),'FinanceImports',[
    'FinanceImportID','Source','ImportedAt','ImportedByPersonID','RowCount',
    'CreatedCount','DuplicateCount','ReviewCount','Notes'
  ]);
}

function recordFinanceTransactionV19(data){
  ensureV19Tables_();
  const processor=String(data.paymentProcessor||'Other');
  const processorID=String(data.processorTransactionID||'').trim();
  if(processorID && getRecords_('FinanceTransactions').some(x=>
    String(x.PaymentProcessor)===processor && String(x.ProcessorTransactionID)===processorID))
    return {ok:true,status:'Duplicate ignored'};

  const gross=Number(data.grossAmount||0);
  const fee=Number(data.processorFee||0);
  const net=data.netAmount!==undefined&&data.netAmount!==''?Number(data.netAmount):gross-fee;
  const id='FIN-'+Utilities.getUuid().slice(0,8).toUpperCase();

  appendRecord_('FinanceTransactions',{
    FinanceTransactionID:id,TransactionDate:data.transactionDate||new Date(),
    TransactionType:data.transactionType||'Unclassified',
    PaymentProcessor:processor,ProcessorTransactionID:processorID,
    GrossAmount:gross,ProcessorFee:fee,NetAmount:net,
    PayerName:data.payerName||'',PayerEmail:data.payerEmail||'',
    RelatedRecordType:data.relatedRecordType||'',RelatedRecordID:data.relatedRecordID||'',
    DogID:data.dogID||'',QuickBooksStatus:'Needs Review',QuickBooksReference:'',
    ReconciliationStatus:'Unreconciled',Notes:data.notes||'',CreatedAt:new Date(),
    CreatedByPersonID:currentPersonId_()
  });

  return {ok:true,id:id,status:'Created'};
}

function getFinanceReviewV19(){
  ensureV19Tables_();
  const rows=getRecords_('FinanceTransactions');
  const review=rows.filter(x=>String(x.QuickBooksStatus)!=='Reviewed');
  return {
    total:rows.length,
    needsReview:review.length,
    unreconciled:rows.filter(x=>String(x.ReconciliationStatus)==='Unreconciled').length,
    fees:rows.reduce((s,x)=>s+Number(x.ProcessorFee||0),0),
    gross:rows.reduce((s,x)=>s+Number(x.GrossAmount||0),0),
    net:rows.reduce((s,x)=>s+Number(x.NetAmount||0),0),
    rows:review.slice(-100).reverse()
  };
}

function updateFinanceReviewV19(id,data){
  updateRecord_('FinanceTransactions','FinanceTransactionID',id,{
    TransactionType:data.transactionType,
    RelatedRecordType:data.relatedRecordType||'',
    RelatedRecordID:data.relatedRecordID||'',
    DogID:data.dogID||'',
    QuickBooksStatus:data.quickBooksStatus||'Needs Review',
    QuickBooksReference:data.quickBooksReference||'',
    ReconciliationStatus:data.reconciliationStatus||'Unreconciled',
    Notes:data.notes||''
  });
  return getFinanceReviewV19();
}

function getDogCostSummaryV19(dogID){
  ensureV19Tables_();
  const rows=getRecords_('FinanceTransactions').filter(x=>String(x.DogID)===String(dogID));
  const income=rows.filter(x=>Number(x.NetAmount||0)>0).reduce((s,x)=>s+Number(x.NetAmount||0),0);
  const expenses=rows.filter(x=>Number(x.NetAmount||0)<0).reduce((s,x)=>s+Math.abs(Number(x.NetAmount||0)),0);
  return {dogID:dogID,income:income,expenses:expenses,net:income-expenses,transactions:rows};
}

function importNormalizedFinanceRowsV19(source,rows,notes){
  ensureV19Tables_();
  let created=0,duplicates=0,review=0;
  (rows||[]).forEach(r=>{
    const result=recordFinanceTransactionV19(r);
    if(result.status==='Duplicate ignored') duplicates++;
    else {created++; if(!r.relatedRecordID) review++;}
  });
  appendRecord_('FinanceImports',{
    FinanceImportID:'FIMP-'+Utilities.getUuid().slice(0,8).toUpperCase(),
    Source:source,ImportedAt:new Date(),ImportedByPersonID:currentPersonId_(),
    RowCount:(rows||[]).length,CreatedCount:created,DuplicateCount:duplicates,
    ReviewCount:review,Notes:notes||''
  });
  return {ok:true,created:created,duplicates:duplicates,review:review};
}

function getFinanceNothingForgottenV19(){
  const r=getFinanceReviewV19(), alerts=[];
  if(r.needsReview) alerts.push({
    type:'Finance',priority:'Normal',title:r.needsReview+' finance transaction(s) need QuickBooks review',
    detail:'Open Finance Review to classify, link, and record QuickBooks review status.'
  });
  if(r.unreconciled) alerts.push({
    type:'Finance',priority:'Normal',title:r.unreconciled+' finance transaction(s) are unreconciled',
    detail:'Review payment processor and RMS links.'
  });
  return alerts;
}
