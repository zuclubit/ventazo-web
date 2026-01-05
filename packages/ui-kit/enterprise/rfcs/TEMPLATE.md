# RFC: [Title]

> **RFC Number:** RFC-XXXX
> **Author:** [Your Name]
> **Date:** YYYY-MM-DD
> **Status:** Draft | Review | Approved | Rejected | Implemented
> **Affects:** Level 1 (Enterprise) | Level 2 (Product)

---

## Summary

[2-3 sentences describing the proposed change]

---

## Motivation

### Problem Statement

[What problem does this solve?]

### Current Behavior

[How does the system behave today?]

### Desired Behavior

[How should the system behave after this change?]

---

## Proposal

### Detailed Design

[Thorough description of the proposed change]

### API Changes

```typescript
// Before
[existing API if applicable]

// After
[proposed API changes]
```

### Policy Changes

| Policy | Current | Proposed |
|--------|---------|----------|
| [policy-id] | [current value] | [proposed value] |

### Token Changes

| Token | Current | Proposed | Rationale |
|-------|---------|----------|-----------|
| [token-id] | [current value] | [proposed value] | [why] |

---

## Impact Analysis

### Affected Teams

- [ ] Team A
- [ ] Team B
- [ ] All teams

### Affected Products

- [ ] Product X
- [ ] Product Y
- [ ] All products

### Migration Effort

- [ ] Low (< 1 day)
- [ ] Medium (1-3 days)
- [ ] High (> 3 days)

### Breaking Changes

- [ ] Yes (describe below)
- [ ] No

[If yes, describe breaking changes and mitigation]

---

## Rollout Plan

### Phase 1: Development

- [ ] Implementation in feature branch
- [ ] Unit tests updated
- [ ] Integration tests updated
- [ ] Documentation updated

### Phase 2: Staging

- [ ] Deploy to staging
- [ ] Smoke tests pass
- [ ] Stakeholder review
- [ ] No regressions

### Phase 3: Production

- [ ] Staged rollout (% traffic)
- [ ] Monitoring active
- [ ] Rollback plan ready
- [ ] Full deployment

### Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| Development | X days | [name] |
| Staging | X days | [name] |
| Production | X days | [name] |

---

## Rollback Plan

### Trigger Conditions

[Under what conditions would we rollback?]

### Rollback Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Rollback Window

[How long after deployment can we rollback?]

---

## Alternatives Considered

### Alternative 1: [Name]

[Description]

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

**Why not chosen:** [Reason]

### Alternative 2: [Name]

[Same structure as above]

---

## Open Questions

- [ ] Question 1?
- [ ] Question 2?
- [ ] Question 3?

---

## References

- [Link to related documents]
- [Link to related issues]
- [Link to related discussions]

---

## Appendix

### A. Technical Details

[Any additional technical information]

### B. Data/Metrics

[Any supporting data or metrics]

---

## Approval

| Role | Name | Date | Decision |
|------|------|------|----------|
| Author | | | Proposed |
| DS Team Lead | | | |
| Stakeholder 1 | | | |
| Stakeholder 2 | | | |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| YYYY-MM-DD | [name] | Initial draft |
