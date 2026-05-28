# To-Do List Application

A modern, fully-featured to-do list application with persistent local storage functionality.

## Features

✅ **Add Tasks** - Easily add new tasks to your list
✅ **Mark Complete** - Check off tasks as you complete them
✅ **Delete Tasks** - Remove individual tasks
✅ **Filter Tasks** - View all, active, or completed tasks
✅ **Local Storage** - Tasks persist even after closing the browser
✅ **Task Counter** - See how many active tasks you have
✅ **Clear Completed** - Remove all completed tasks at once
✅ **Responsive Design** - Works great on desktop and mobile
✅ **Beautiful UI** - Modern gradient design with smooth animations

## Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Responsive styling with gradients and animations
- **Vanilla JavaScript** - No frameworks or dependencies
- **Local Storage API** - Browser storage for data persistence

## How to Use

1. Open `index.html` in your web browser
2. Type a task in the input field
3. Click "Add Task" or press Enter
4. Check the checkbox to mark tasks complete
5. Click "Delete" to remove a task
6. Use filter buttons to view different task categories
7. Click "Clear Completed" to remove all finished tasks

## Project Structure

```
├── index.html      # HTML markup
├── styles.css      # Styling and responsive design
├── script.js       # Application logic
└── README.md       # Documentation
```

## Local Storage Details

The application stores all tasks in the browser's local storage under the key `todoList`. Each task object contains:

```javascript
{
    id: timestamp,           // Unique identifier
    text: string,            // Task description
    completed: boolean,      // Completion status
    createdAt: string        // Creation date/time
}
```

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Features Breakdown

### Add Task
- Enter text and click "Add Task" or press Enter
- Tasks are added to the top of the list
- Input field clears automatically

### Filter Options
- **All** - Shows all tasks
- **Active** - Shows only incomplete tasks
- **Completed** - Shows only completed tasks

### Statistics
- Task counter shows number of active tasks
- Updates automatically as tasks are completed

### Data Persistence
- All tasks saved to browser's local storage
- Survives browser refresh and close
- Clear browser data to reset the list

## Limitations

- Storage limited to ~5-10MB per domain (browser dependent)
- Data is cleared if browser data is cleared
- Not synced across devices (local storage only)

## Future Enhancements

- Cloud synchronization
- Task categories/tags
- Due dates and reminders
- Task priority levels
- Edit task functionality
- Export/import tasks
- Dark mode theme

## License

MIT License - Feel free to use and modify

## Author

Created as a modern to-do list application
