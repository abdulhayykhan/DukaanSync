import { adminDb } from '@/lib/firebase/admin';

export async function authorizeShopAccess(
  decodedToken: any,
  businessId: string,
  shopId: string,
  allowedRoles: string[]
) {
  // 1. Fetch business doc to check for owner bypass
  const businessSnap = await adminDb.collection('businesses').doc(businessId).get();
  if (!businessSnap.exists) {
    return { authorized: false, error: 'Business not found', status: 404 };
  }
  const isOwner = businessSnap.data()?.ownerId === decodedToken.uid;

  // 2. Fetch member doc
  const memberSnap = await adminDb.collection('businesses').doc(businessId).collection('members').doc(decodedToken.uid).get();
  if (!memberSnap.exists) {
    return { authorized: false, error: 'Not a member of this business', status: 403 };
  }
  const member = memberSnap.data()!;

  // 3. Check shop access (Owner bypasses shopId check)
  if (!isOwner) {
    if (!member.shopIds || !member.shopIds.includes(shopId)) {
      return { authorized: false, error: 'Not authorized for this shop', status: 403 };
    }
  }

  // 4. Check role permission
  if (!allowedRoles.includes(member.role)) {
    return { authorized: false, error: 'Insufficient role permissions', status: 403 };
  }

  return { authorized: true };
}
