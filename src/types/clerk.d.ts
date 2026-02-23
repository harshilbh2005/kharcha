// ============================================================
// KHARCHA — Clerk global type augmentations
//
// Extends Clerk's built-in interfaces so TypeScript knows about
// the custom fields we store in publicMetadata / sessionClaims.
//
// Requires the Clerk session token to be customised in the
// Clerk Dashboard (Configure → Sessions → Edit → Custom claims):
//   { "metadata": "{{user.public_metadata}}" }
// ============================================================

export {};

declare global {
  /**
   * Shape of the `metadata` field we inject into every JWT.
   * Accessed via `(await auth()).sessionClaims?.metadata` in
   * middleware / Server Components / Route Handlers.
   */
  interface CustomJwtSessionClaims {
    metadata?: {
      onboarding_completed?: boolean;
    };
  }

  /**
   * Shape of `user.publicMetadata` on the Clerk `User` object.
   * Accessed via `useUser().user?.publicMetadata` in Client
   * Components.
   */
  interface UserPublicMetadata {
    onboarding_completed?: boolean;
  }
}
