// Temporary integration test: only Joe's verified wallet on this exact preview.
export const RENTAL_TEST_WALLET='erd1j5afnnskrvrme5j44u2drddw7tq9masxm0p3spt7dj4d8xac30aqsqh66n';
export const RENTAL_TEST_ORIGIN='https://deploy-preview-28--cryptopittz.netlify.app';
export const RENTAL_TEST_POLICY='2026-10-16-one-bonez-test-v1';
export function rentalTestAllowed(address,origin){return address===RENTAL_TEST_WALLET&&origin===RENTAL_TEST_ORIGIN;}
