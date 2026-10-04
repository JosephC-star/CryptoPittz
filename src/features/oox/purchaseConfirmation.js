export function purchaseConfirmed(transaction, owned, expected, identifier) {
  return transaction.status === 'success' &&
    transaction.sender === expected.sender && transaction.receiver === expected.receiver &&
    transaction.value === expected.value && transaction.data === expected.data &&
    owned.identifier === identifier && owned.collection === identifier.split('-').slice(0, 2).join('-') &&
    owned.type === 'NonFungibleESDT' && (!owned.balance || owned.balance === '1');
}
