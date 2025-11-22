# Drag and Drop Reorganization Implementation Plan

## Overview
Implementing drag-and-drop functionality to reorganize content (e.g., nesting documents within folders) requires both frontend UI changes and backend API integration with Plone's REST API.

## What's Needed

### 1. Frontend Implementation (HTML5 Drag and Drop API)

#### A. Make Items Draggable
- Add `draggable="true"` attribute to each item row (`<li>` element)
- Store item metadata in `dataTransfer` during drag start
- Add visual feedback (opacity change, cursor change) when dragging

#### B. Define Drop Targets
- Make folder items accept drops (only folders can be drop targets)
- Add visual indicators when dragging over valid drop targets:
  - Highlight border
  - Background color change
  - Show "Drop here" indicator
- Prevent drops on invalid targets (non-folders, same item, etc.)

#### C. Handle Drop Events
- `dragstart`: Store source item path/ID
- `dragover`: Prevent default, show visual feedback
- `drop`: Execute move operation via API
- `dragend`: Clean up visual state

### 2. Plone REST API Integration

#### A. Move Endpoint
Plone REST API supports moving content via the `@move` endpoint:

**Move Endpoint:**
```bash
POST /++api++/path/to/destination/@move
Content-Type: application/json
{
  "source": "/++api++/path/to/source/item"
}
```

**Example:**
```bash
curl -i -X POST http://localhost:55001/plone/folder/@move \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{ "source": "/plone/front-page" }' \
  --user admin:secret
```

**Notes:**
- The destination is specified in the URL path (the folder to move into)
- The source is specified in the request body
- Authentication required (token or basic auth)
- Returns success response or error with details

#### B. Required API Functions
Add to `src/lib/api.ts`:
```typescript
/**
 * Move an item to a new parent folder
 */
export async function moveItem(
  sourcePath: string,
  destinationPath: string
): Promise<any>

/**
 * Copy an item to a new location
 */
export async function copyItem(
  sourcePath: string,
  destinationPath: string
): Promise<any>

/**
 * Delete an item
 */
export async function deleteItem(path: string): Promise<any>
```

#### C. Rust Backend Implementation
Add to `src-tauri/src/api.rs`:
```rust
#[tauri::command]
async fn move_item(
    source_path: String,
    destination_path: String,
    state: State<'_, ApiClientState>,
) -> Result<Value, String>

#[tauri::command]
async fn copy_item(
    source_path: String,
    destination_path: String,
    state: State<'_, ApiClientState>,
) -> Result<Value, String>

#[tauri::command]
async fn delete_item(
    path: String,
    state: State<'_, ApiClientState>,
) -> Result<Value, String>
```

### 3. Validation and Error Handling

#### A. Pre-Drop Validation
- Check if destination is a folder (`is_folderish`)
- Prevent dropping item into itself
- Prevent dropping parent into child (circular reference)
- Check user permissions (may require additional API call)

#### B. Error Handling
- Handle API errors gracefully
- Show user-friendly error messages
- Rollback UI changes if move fails
- Handle network timeouts

### 4. User Experience Enhancements

#### A. Visual Feedback
- **During drag**: 
  - Reduce opacity of dragged item
  - Show drag cursor
  - Highlight valid drop targets
  - Show "Cannot drop here" for invalid targets
  
- **On hover over drop target**:
  - Highlight border (e.g., blue dashed border)
  - Background color change
  - Show tooltip "Drop to move here"

#### B. Loading States
- Show loading indicator during move operation
- Disable drag/drop during operation
- Show success/error notification

#### C. Undo Functionality (Optional)
- Store move history
- Allow undo of last move operation
- Useful for accidental moves

### 5. Implementation Steps

1. **Research Plone REST API**
   - Test move/copy endpoints on a Plone site
   - Verify required permissions
   - Check if `@move` endpoint exists or need to use PATCH

2. **Add API Functions**
   - Implement `moveItem`, `copyItem`, `deleteItem` in `api.ts`
   - Add corresponding Rust commands in `api.rs`
   - Test API calls independently

3. **Implement Drag and Drop UI**
   - Add `draggable` attribute to items
   - Implement drag event handlers
   - Add drop zone styling
   - Test visual feedback

4. **Integrate API with Drop Handler**
   - Call move API on drop
   - Handle success/error states
   - Refresh item list after move
   - Update current path if needed

5. **Add Validation**
   - Check valid drop targets
   - Prevent invalid operations
   - Show appropriate error messages

6. **Testing**
   - Test moving items to folders
   - Test moving folders
   - Test error cases (permissions, invalid targets)
   - Test with different content types

### 6. Code Structure

#### Modified Files:
- `src/main.ts`: Add drag/drop event handlers to item rendering
- `src/lib/api.ts`: Add move/copy/delete functions
- `src-tauri/src/api.rs`: Add Rust command handlers
- `src/style.css`: Add drag/drop visual styles

#### New Functions Needed:
```typescript
// In main.ts
function setupDragAndDrop(item: api.ItemMetadata, li: HTMLElement)
function handleDragStart(e: DragEvent, item: api.ItemMetadata)
function handleDragOver(e: DragEvent, targetItem: api.ItemMetadata)
function handleDrop(e: DragEvent, targetItem: api.ItemMetadata)
function isValidDropTarget(source: api.ItemMetadata, target: api.ItemMetadata): boolean
```

### 7. Considerations

#### A. Permissions
- User must have "Move" permission on source item
- User must have "Add" permission on destination folder
- May need to check permissions before allowing drag

#### B. Performance
- Large folders may have many items
- Consider virtual scrolling for large lists
- Debounce drag events if needed

#### C. Accessibility
- Provide keyboard alternative (e.g., context menu "Move to...")
- Ensure screen reader compatibility
- Add ARIA labels for drag/drop operations

#### D. Edge Cases
- Moving item to same location (no-op)
- Moving item that's currently being viewed
- Moving item while search is active
- Network failures during move

### 8. Estimated Complexity

- **Frontend UI**: Medium (2-3 hours)
  - Drag/drop API is straightforward
  - Visual feedback requires careful styling
  
- **API Integration**: Medium-Hard (3-4 hours)
  - Need to research/test Plone REST API endpoints
  - Error handling can be complex
  
- **Validation**: Medium (1-2 hours)
  - Need to check various edge cases
  
- **Testing**: Medium (2-3 hours)
  - Multiple scenarios to test
  
**Total Estimated Time**: 8-12 hours

### 9. Alternative Approach: Context Menu

If drag-and-drop proves complex, consider a context menu approach:
- Right-click item → "Move to..." → Select destination folder
- Simpler to implement
- More accessible
- Less visual complexity

## Next Steps

1. **Research Phase**: Test Plone REST API move endpoints
2. **Proof of Concept**: Implement basic drag/drop for one item type
3. **Full Implementation**: Extend to all content types
4. **Polish**: Add visual feedback, error handling, edge cases

