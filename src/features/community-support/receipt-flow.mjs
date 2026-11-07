import {supportMessage} from '../../../shared/support-purchase.mjs';

// A confirmed purchase still needs the purchaser's free receipt approval.
// Reuse that approval if transfer indexing is a little behind confirmation.
export async function saveSupportReceipt({receipt, origin, visible, sign, save, wait = ms => new Promise(resolve => setTimeout(resolve, ms))}) {
  const publicName = receipt.automatic || (typeof receipt.visible === 'boolean' ? receipt.visible : visible);
  const signature = receipt.automatic ? undefined : await sign(receipt.address, supportMessage({...receipt, origin, visible: publicName}));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await save({...receipt, visible: publicName, signature});
      if (result?.recorded !== true) throw Error('Receipt saving could not be confirmed.');
      return {visible: publicName};
    } catch (error) {
      if (attempt === 2 || error.status !== 422 || !/not fully confirmed|not indexed yet/i.test(error.message)) throw error;
      await wait(3000);
    }
  }
}
