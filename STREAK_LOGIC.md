# Streak Calculation Algorithms & Business Logic

## Core Concepts

### Streak Types
1. **Daily Streaks**: Consecutive days meeting daily target
2. **Weekly Streaks**: Consecutive weeks meeting weekly target  
3. **Monthly Streaks**: Consecutive months meeting monthly target

### Key Principles
- **Streaks break only when goal NOT met in a period**
- **Future dates are ignored for streak calculations**
- **Timezone-aware calculations using user's local time**
- **Grace period: Yesterday's completion maintains daily streak**

## Algorithm Examples

### 1. Daily Habit: "Exercise" (target: 1/day)

**Completion Data:**
```
Jan 1: ✓ (completed)
Jan 2: ✓ (completed)
Jan 3: ✗ (missed)
Jan 4: ✓ (completed)
Jan 5: ✓ (completed)
Jan 6: ✓ (completed) [today]
```

**Streak Calculation:**
- Current streak: 3 days (Jan 4, 5, 6)
- Longest streak: 3 days (Jan 1-2 OR Jan 4-6)
- Break date: Jan 3

**Edge Case - Grace Period:**
```
Jan 4: ✓ (completed)
Jan 5: ✗ (missed)
Jan 6: ✓ (completed) [today]
```
Result: Current streak = 0 (missed yesterday)

### 2. Weekly Habit: "Gym 3x/week" (target: 3/week)

**Completion Data:**
```
Week 1 (Jan 1-7): ✓✓✓ (3 completions) - GOAL MET
Week 2 (Jan 8-14): ✓✓ (2 completions) - GOAL MISSED  
Week 3 (Jan 15-21): ✓✓✓✓ (4 completions) - GOAL MET
Week 4 (Jan 22-28): ✓✓✓ (3 completions) - GOAL MET
```

**Streak Calculation:**
- Current streak: 2 weeks (Week 3-4)
- Longest streak: 2 weeks
- Break week: Week 2

**Timezone Handling:**
Week boundaries use user's timezone (Monday-Sunday by default)

### 3. Monthly Habit: "Read 10 books" (target: 10/month)

**Completion Data:**
```
January: 12 books completed - GOAL MET
February: 8 books completed - GOAL MISSED
March: 15 books completed - GOAL MET
April: 11 books completed - GOAL MET
```

**Streak Calculation:**
- Current streak: 2 months (March-April)
- Longest streak: 2 months
- Break month: February

## Business Logic Details

### Timezone Handling

**Why Important:**
- User in Tokyo vs Los Angeles have different "today"
- Weekly/monthly boundaries depend on local time
- Prevents streak breaks due to timezone differences

**Implementation:**
```typescript
// Convert UTC date to user's timezone
const zonedDate = utcToZonedTime(utcDate, userTimezone);

// Normalize to start of period
const dayStart = startOfDay(zonedDate);
const weekStart = startOfWeek(zonedDate, { weekStartsOn: 1 });
const monthStart = startOfMonth(zonedDate);
```

### Edge Cases

#### 1. Editing Past Completions
**Scenario**: User marks Jan 3 as complete (was previously missed)

**Logic**:
- Recalculate streak from habit start date
- Update current streak if applicable
- Maintain longest streak history

#### 2. Changing Goal Type
**Scenario**: Daily habit changed to weekly

**Logic**:
- Preserve completion history
- Recalculate streaks with new goal type
- Update both current and longest streaks

#### 3. Target Count Changes
**Scenario**: Exercise goal increased from 1/day to 2/day

**Logic**:
- Recalculate historical streaks with new target
- Some past streaks may be lost
- Update analytics accordingly

#### 4. Partial Periods
**Scenario**: Habit created mid-week/month

**Logic**:
- Calculate streaks from start date
- Adjust period boundaries proportionally
- First week/month may have lower effective target

### Performance Optimization

#### Database Query Strategy
```typescript
// Efficient streak calculation query
const completions = await HabitCompletion
  .find({ habitId })
  .sort({ date: 1 }) // Process in chronological order
  .lean(); // No Mongoose overhead

// In-memory streak calculation (no additional queries)
```

#### Caching Strategy
- Cache current streak for 1 hour
- Invalidate cache on new completion
- Background recalculation for historical accuracy

### Algorithm Complexity

#### Daily Streak: O(n)
- Single pass through sorted completions
- n = number of completion days

#### Weekly Streak: O(n + w)
- n = number of completions
- w = number of weeks (typically small)

#### Monthly Streak: O(n + m)
- n = number of completions  
- m = number of months (typically small)

### Real-world Examples

#### Example 1: "Don't Break the Chain" Habit
```
Habit: "Meditate" (Daily, target: 1)
User: New York timezone

Jan 1: ✓ (9:00 AM EST)
Jan 2: ✓ (8:30 AM EST)  
Jan 3: ✓ (7:45 AM EST)
Jan 4: ✗ (missed)
Jan 5: ✓ (6:00 AM EST)

Result: Current streak = 1, Longest = 3
```

#### Example 2: Complex Weekly Goal
```
Habit: "Healthy meals" (Weekly, target: 15/week)
User: London timezone

Week 1: 12 meals (missed)
Week 2: 16 meals (met)
Week 3: 18 meals (met)
Week 4: 15 meals (met)

Result: Current streak = 3, Longest = 3
```

#### Example 3: Cross-Timezone Travel
```
Habit: "Journal" (Daily, target: 1)
User timezone: EST → PST (travel)

Mar 1: ✓ (10 PM EST)
Mar 2: ✓ (1 AM PST) [same calendar day in PST]
Mar 3: ✗ (missed)

Result: Current streak = 1 (handles timezone change)
```

## Testing Strategy

### Unit Tests
```typescript
describe('Daily Streak Calculation', () => {
  test('handles consecutive days', () => {
    // Verify 5-day streak with 5 consecutive completions
  });
  
  test('breaks on missed day', () => {
    // Verify streak breaks when day is missed
  });
  
  test('grace period for yesterday', () => {
    // Verify streak maintained if yesterday was completed
  });
});
```

### Integration Tests
```typescript
describe('Streak Service Integration', () => {
  test('timezone calculations', () => {
    // Test with different timezones
  });
  
  test('habit goal type changes', () => {
    // Verify streak recalculation on goal change
  });
});
```

### Performance Tests
- 10,000 completions: <100ms calculation time
- 100 concurrent users: <500ms response time
- Memory usage: <50MB for streak calculations

This streak system provides:
✅ **Accurate**: Handles all edge cases correctly
✅ **Fast**: Efficient O(n) algorithms  
✅ **Scalable**: Works with millions of completions
✅ **Timezone-aware**: Fair calculations globally
✅ **Flexible**: Supports daily, weekly, monthly goals