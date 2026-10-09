export const GUARDIAN_GAS = 50000;
export function guardianForAccount(account, validateAddress) {
  if (!account.isGuarded) return null;
  const guardian = account.activeGuardianAddress;
  if (!guardian) throw Error('Unable to verify your active guardian. Reconnect your wallet and try again.');
  validateAddress(guardian);
  return guardian;
}
export function withGuardian(spec, guardian) {
  return guardian ? { ...spec, gasLimit: spec.gasLimit + GUARDIAN_GAS, guardian, options: 2 } : spec;
}
export function assertGuardianUnchanged(account, guardian, validateAddress) {
  if (guardianForAccount(account, validateAddress) !== guardian) throw Error('Wallet protection changed. Get a fresh quote and review the swap again.');
}
export function checkSwapPayload(p, spec, signed = false) {
  const expected = { ...spec, data: btoa(spec.data) };
  for (const [key, value] of Object.entries(expected)) {
    // Hash signing may set the first bit; the guarded bit must remain set.
    if (key === 'options' && spec.guardian && signed && [2, 3].includes(p.options)) continue;
    if (p[key] !== value) throw Error('Transaction verification failed: ' + key + '.');
  }
  if (p.relayer || p.relayerSignature || p.senderUsername || p.receiverUsername) throw Error('Unsupported transaction configuration.');
  if (!spec.guardian && (p.guardian || p.guardianSignature || p.options)) throw Error('Unexpected guardian transaction configuration.');
  if (signed) {
    if (!/^[a-f0-9]{128}$/i.test(p.signature || '') || /^0+$/.test(p.signature)) throw Error('Your wallet did not complete transaction signing.');
    if (spec.guardian && (!/^[a-f0-9]{128}$/i.test(p.guardianSignature || '') || /^0+$/.test(p.guardianSignature))) throw Error('Guardian approval was not completed. Please approve with your wallet guardian and try again.');
  }
  return p;
}
