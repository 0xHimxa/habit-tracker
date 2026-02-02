# MongoDB Schema Design

## Collection Overview

### 1. Users Collection
```typescript
{
  _id: ObjectId,
  email: string (unique, indexed),
  password: string (bcrypt hash),
  name: string,
  timezone: string (default: 'UTC'),
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Habits Collection
```typescript
{
  _id: ObjectId,
  userId: ObjectId (indexed),
  name: string,
  description: string (optional),
  goalType: 'daily' | 'weekly' | 'monthly',
  targetCount: number (1-1000),
  startDate: Date,
  active: boolean (indexed),
  createdAt: Date,
  updatedAt: Date
}
```

### 3. HabitCompletions Collection
```typescript
{
  _id: ObjectId,
  userId: ObjectId (indexed),
  habitId: ObjectId (indexed),
  completedAt: Date,
  date: Date (normalized to start of day, indexed),
  createdAt: Date
}
```

## Design Decisions

### Referenced vs Embedded Documents

**Chosen: Referenced Documents**

**Why:**
1. **Scalability**: Habits can have unlimited completions over time
2. **Query Performance**: Separate collections allow targeted indexing
3. **Flexibility**: Easy to add analytics, exports, and completion history
4. **Data Integrity**: Single source of truth for each completion
5. **Storage Efficiency**: No data duplication across habits

**Trade-offs:**
- Additional JOIN queries required (handled with population)
- Slightly higher latency for complex queries (mitigated with indexing)

### Indexing Strategy

#### Users Collection
```javascript
{ email: 1 } // Fast login queries
```

#### Habits Collection
```javascript
{ userId: 1, active: 1 } // User's active habits
{ userId: 1, goalType: 1 } // Filter by habit type
{ userId: 1, createdAt: -1 } // Recently created habits
```

#### HabitCompletions Collection
```javascript
{ userId: 1, habitId: 1, date: 1 } // User's specific habit completions
{ userId: 1, date: 1 } // User's all completions for dashboard
{ habitId: 1, date: 1 } // Specific habit completion history
```

**Compound Index Benefits:**
- Calendar queries: `{ userId: 1, date: 1 }`
- Streak calculations: `{ habitId: 1, date: -1 }`
- Analytics: `{ userId: 1, habitId: 1, date: 1 }`

## Query Optimization Examples

### 1. Fetch User's Habits with Completion Status
```javascript
// Optimized query with single roundtrip
db.habits.find({ 
  userId: ObjectId("..."), 
  active: true 
}).populate({
  path: 'completions',
  match: { date: { $gte: startDate, $lte: endDate } }
});
```

### 2. Calendar Month View
```javascript
// Efficient date range query
db.habitcompletions.find({
  userId: ObjectId("..."),
  date: {
    $gte: new Date('2024-01-01'),
    $lt: new Date('2024-02-01')
  }
});
```

### 3. Streak Calculation
```javascript
// Sorted for efficient streak processing
db.habitcompletions.find({
  habitId: ObjectId("...")
}).sort({ date: -1 });
```

## Data Consistency

### ACID Properties
- **Atomic Operations**: Single document updates are atomic
- **Transactions**: Multi-document operations use transactions for critical updates
- **Validation**: Mongoose schema validation prevents invalid data
- **Referential Integrity**: Application-level checks for foreign key relationships

### Concurrency Handling
- **Optimistic Locking**: Version fields for critical updates
- **Unique Constraints**: Email and completion uniqueness
- **Retry Logic**: Handle transient MongoDB errors

## Scaling Considerations

### Horizontal Scaling
- **Sharding**: User-based sharding key (userId)
- **Read Replicas**: Analytics and reporting queries
- **Connection Pooling**: Efficient database connections

### Performance Optimization
- **Projection**: Select only needed fields
- **Pagination**: Limit query results
- **Caching**: Hot habits and recent completions
- **Background Jobs**: Analytics calculations

### Storage Optimization
- **TTL Indexes**: Optional cleanup of old data
- **Compression**: MongoDB native compression
- **Data Archiving**: Move old completions to cold storage

## Security Considerations

### Access Control
- **User Isolation**: All queries filtered by userId
- **Authentication**: JWT tokens validated at API level
- **Authorization**: Role-based access to features

### Data Protection
- **Encryption**: Field-level encryption for sensitive data
- **Audit Logs**: Track all modifications
- **Backup Strategy**: Regular encrypted backups

## Migration Strategy

### Schema Evolution
```javascript
// Example: Adding new field with backward compatibility
db.habits.updateMany(
  { category: { $exists: false } },
  { $set: { category: 'general' } }
);
```

### Data Validation
- **Pre-migration validation**: Check data integrity
- **Rollback plans**: Revert schema changes if needed
- **Zero-downtime**: Deploy schema changes without service interruption

This schema design provides:
✅ **Scalable**: Handles millions of completions efficiently
✅ **Performant**: Optimized for calendar and analytics queries  
✅ **Flexible**: Easy to add new features and relationships
✅ **Reliable**: Strong data consistency and integrity
✅ **Secure**: User data isolation and access control