// "use client";

// import { useState, useEffect, useCallback } from "react";

// import type {
//   ProfileData,
//   ProfilePageData,
//   ProfileSectionError,
//   SeatPreferences,
//   EditProfileForm,
//   EditPreferencesForm,
// } from "../types/profile.types";
// import { getProfileData, updatePreferences, updateProfile, uploadAvatar } from "../services/profile.service.";

// // ─── State shape ──────────────────────────────────────────────────────────────

// interface UseProfileState {
//   data:       ProfilePageData | null;
//   isLoading:  boolean;
//   isFatal:    boolean;
//   fatalError: ProfileSectionError | null;
//   errors:     ProfileSectionError[];
//   // Saving states
//   isSavingProfile:     boolean;
//   isSavingPreferences: boolean;
//   isUploadingAvatar:   boolean;
// }

// // ─── Return shape ─────────────────────────────────────────────────────────────

// export interface UseProfileReturn extends UseProfileState {
//   refetch:            () => Promise<void>;
//   handleUpdateProfile:     (form: EditProfileForm)      => Promise<void>;
//   handleUpdatePreferences: (form: EditPreferencesForm)  => Promise<void>;
//   handleUploadAvatar:      (file: File)                 => Promise<void>;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function parseCommaSeparated(val: string): string[] {
//   return val
//     .split(",")
//     .map((s) => s.trim())
//     .filter(Boolean);
// }

// // ─── Hook ─────────────────────────────────────────────────────────────────────

// export function useProfile(): UseProfileReturn {
//   const [state, setState] = useState<UseProfileState>({
//     data:                null,
//     isLoading:           true,
//     isFatal:             false,
//     fatalError:          null,
//     errors:              [],
//     isSavingProfile:     false,
//     isSavingPreferences: false,
//     isUploadingAvatar:   false,
//   });

//   const fetch = useCallback(async () => {
//     setState((s) => ({ ...s, isLoading: true, isFatal: false, fatalError: null }));
//     const result = await getProfileData();

//     if (!result.ok) {
//       setState((s) => ({
//         ...s, isLoading: false, isFatal: true, fatalError: result.fatal,
//       }));
//       return;
//     }

//     setState((s) => ({
//       ...s,
//       isLoading: false,
//       data:      result.data,
//       errors:    result.errors,
//     }));
//   }, []);

//   useEffect(() => { fetch(); }, [fetch]);

//   // ── Handlers ────────────────────────────────────────────────────────────────

//   const handleUpdateProfile = useCallback(async (form: EditProfileForm) => {
//     setState((s) => ({ ...s, isSavingProfile: true }));
//     try {
//       const updated = await updateProfile({
//         display_name:   form.displayName   || undefined,
//         phone:          form.phone         || undefined,
//         personal_email: form.personalEmail || undefined,
//         bio:            form.bio           || undefined,
//         skills:         form.skills.length ? form.skills : undefined,
//       });
//       setState((s) => ({
//         ...s,
//         isSavingProfile: false,
//         data: s.data ? { ...s.data, profile: updated } : s.data,
//       }));
//     } catch {
//       setState((s) => ({ ...s, isSavingProfile: false }));
//       throw new Error("Failed to update profile. Please try again.");
//     }
//   }, []);

//   const handleUpdatePreferences = useCallback(async (form: EditPreferencesForm) => {
//     setState((s) => ({ ...s, isSavingPreferences: true }));
//     try {
//     //   const updated = await updatePreferences({
//     //     preferred_office:    form.preferredOffice    || undefined,
//     //     preferred_floor:     form.preferredFloor     || undefined,
//     //     seat_type:           form.seatType           || undefined,
//     //     near_teammates:      parseCommaSeparated(form.nearTeammates),
//     //     away_from:           parseCommaSeparated(form.awayFrom),
//     //     noise_preference:    form.noisePreference    || undefined,
//     //     preferred_amenities: parseCommaSeparated(form.preferredAmenities),
//     //     other_preferences:   parseCommaSeparated(form.otherPreferences),
//     //   });
//     const updated = await updatePreferences({
//   preferred_office:  form.preferredOffice  || undefined,
//   preferred_floor:   form.preferredFloor   || undefined,
//   seat_type:         form.seatType         || undefined,
//   near_teammates:    parseCommaSeparated(form.nearTeammates),
//   away_from:         parseCommaSeparated(form.awayFrom),
//   noise_preference:  form.noisePreference  || undefined,
//   other_preferences: parseCommaSeparated(form.otherPreferences),
// });
//       setState((s) => ({
//         ...s,
//         isSavingPreferences: false,
//         data: s.data ? { ...s.data, preferences: updated } : s.data,
//       }));
//     } catch {
//       setState((s) => ({ ...s, isSavingPreferences: false }));
//       throw new Error("Failed to update preferences. Please try again.");
//     }
//   }, []);

//   const handleUploadAvatar = useCallback(async (file: File) => {
//     setState((s) => ({ ...s, isUploadingAvatar: true }));
//     try {
//       const avatarUrl = await uploadAvatar(file);
//       setState((s) => ({
//         ...s,
//         isUploadingAvatar: false,
//         data: s.data
//           ? { ...s.data, profile: { ...s.data.profile, avatarUrl } }
//           : s.data,
//       }));
//     } catch {
//       setState((s) => ({ ...s, isUploadingAvatar: false }));
//       throw new Error("Failed to upload avatar. Please try again.");
//     }
//   }, []);

//   return {
//     ...state,
//     refetch:                 fetch,
//     handleUpdateProfile,
//     handleUpdatePreferences,
//     handleUploadAvatar,
//   };
// }

"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ProfilePageData,
  ProfileSectionError,
  EditProfileForm,
  EditPreferencesForm,
} from "../types/profile.types";
import { getProfileData, updatePreferences, updateProfile, uploadAvatar } from "../services/profile.service.";

interface UseProfileState {
  data:                ProfilePageData | null;
  isLoading:           boolean;
  isFatal:             boolean;
  fatalError:          ProfileSectionError | null;
  errors:              ProfileSectionError[];
  isSavingProfile:     boolean;
  isSavingPreferences: boolean;
  isUploadingAvatar:   boolean;
}

export interface UseProfileReturn extends UseProfileState {
  refetch:                 () => Promise<void>;
  handleUpdateProfile:     (form: EditProfileForm)     => Promise<void>;
  handleUpdatePreferences: (form: EditPreferencesForm) => Promise<void>;
  handleUploadAvatar:      (file: File)                => Promise<void>;
}

function parseCommaSeparated(val: string): string[] {
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

export function useProfile(): UseProfileReturn {
  const [state, setState] = useState<UseProfileState>({
    data:                null,
    isLoading:           true,
    isFatal:             false,
    fatalError:          null,
    errors:              [],
    isSavingProfile:     false,
    isSavingPreferences: false,
    isUploadingAvatar:   false,
  });

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, isFatal: false, fatalError: null }));
    const result = await getProfileData();

    if (!result.ok) {
      setState((s) => ({ ...s, isLoading: false, isFatal: true, fatalError: result.fatal }));
      return;
    }

    setState((s) => ({ ...s, isLoading: false, data: result.data, errors: result.errors }));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleUpdateProfile = useCallback(async (form: EditProfileForm) => {
    setState((s) => ({ ...s, isSavingProfile: true }));
    try {
      const updated = await updateProfile({
        display_name:   form.displayName   || undefined,
        phone:          form.phone         || undefined,
        personal_email: form.personalEmail || undefined,
        bio:            form.bio           || undefined,
        skills:         form.skills.length ? form.skills : undefined,
      });
      setState((s) => ({
        ...s,
        isSavingProfile: false,
        data: s.data ? { ...s.data, profile: updated } : s.data,
      }));
    } catch {
      setState((s) => ({ ...s, isSavingProfile: false }));
      throw new Error("Failed to update profile. Please try again.");
    }
  }, []);

  const handleUpdatePreferences = useCallback(async (form: EditPreferencesForm) => {
    setState((s) => ({ ...s, isSavingPreferences: true }));
    try {
      const updated = await updatePreferences({
        preferred_office:  form.preferredOffice  || undefined,
        preferred_floor:   form.preferredFloor   || undefined,
        seat_type:         form.seatType         || undefined,
        near_teammates:    parseCommaSeparated(form.nearTeammates),
        away_from:         parseCommaSeparated(form.awayFrom),
        noise_preference:  form.noisePreference  || undefined,
        other_preferences: parseCommaSeparated(form.otherPreferences),
      });
      setState((s) => ({
        ...s,
        isSavingPreferences: false,
        data: s.data ? { ...s.data, preferences: updated } : s.data,
      }));
    } catch {
      setState((s) => ({ ...s, isSavingPreferences: false }));
      throw new Error("Failed to update preferences. Please try again.");
    }
  }, []);

  const handleUploadAvatar = useCallback(async (file: File) => {
    setState((s) => ({ ...s, isUploadingAvatar: true }));
    try {
      const avatarUrl = await uploadAvatar(file);
      setState((s) => ({
        ...s,
        isUploadingAvatar: false,
        data: s.data
          ? { ...s.data, profile: { ...s.data.profile, avatarUrl } }
          : s.data,
      }));
    } catch {
      setState((s) => ({ ...s, isUploadingAvatar: false }));
      throw new Error("Failed to upload avatar. Please try again.");
    }
  }, []);

  return {
    ...state,
    refetch: fetch,
    handleUpdateProfile,
    handleUpdatePreferences,
    handleUploadAvatar,
  };
}