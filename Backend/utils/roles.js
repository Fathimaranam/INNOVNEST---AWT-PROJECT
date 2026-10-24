// Profile roles a member can choose for themselves.
// "Admin" is intentionally not here: it can never be self-assigned.
const MEMBER_ROLES = ["Founder", "Student", "Investor", "Mentor"];

// Older accounts may hold these values; they stay valid but are not offered for new choices.
const LEGACY_ROLES = ["Developer", "Designer", "Member"];

function isSelectableRole(role) {
    return MEMBER_ROLES.includes(role) || LEGACY_ROLES.includes(role);
}

module.exports = { MEMBER_ROLES, LEGACY_ROLES, isSelectableRole };
