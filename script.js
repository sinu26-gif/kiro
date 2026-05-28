// To-Do List Application with Local Storage

class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.storageKey = 'todoList';
        
        // DOM elements
        this.todoInput = document.getElementById('todoInput');
        this.addBtn = document.getElementById('addBtn');
        this.todoList = document.getElementById('todoList');
        this.taskCount = document.getElementById('taskCount');
        this.clearBtn = document.getElementById('clearBtn');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        
        this.init();
    }
    
    init() {
        // Load todos from local storage
        this.loadFromStorage();
        
        // Event listeners
        this.addBtn.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
        this.clearBtn.addEventListener('click', () => this.clearCompleted());
        
        // Filter buttons
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.render();
            });
        });
        
        // Initial render
        this.render();
    }
    
    addTodo() {
        const text = this.todoInput.value.trim();
        
        if (text === '') {
            alert('Please enter a task!');
            return;
        }
        
        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toLocaleString()
        };
        
        this.todos.unshift(todo);
        this.todoInput.value = '';
        this.todoInput.focus();
        
        this.saveToStorage();
        this.render();
    }
    
    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.saveToStorage();
        this.render();
    }
    
    toggleComplete(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveToStorage();
            this.render();
        }
    }
    
    clearCompleted() {
        if (this.todos.filter(t => t.completed).length === 0) {
            alert('No completed tasks to clear!');
            return;
        }
        
        if (confirm('Are you sure you want to delete all completed tasks?')) {
            this.todos = this.todos.filter(todo => !todo.completed);
            this.saveToStorage();
            this.render();
        }
    }
    
    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(todo => !todo.completed);
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            default:
                return this.todos;
        }
    }
    
    render() {
        const filteredTodos = this.getFilteredTodos();
        
        // Update task count
        const activeTasks = this.todos.filter(t => !t.completed).length;
        this.taskCount.textContent = `${activeTasks} task${activeTasks !== 1 ? 's' : ''}`;
        
        // Clear the list
        this.todoList.innerHTML = '';
        
        // Render todos
        if (filteredTodos.length === 0) {
            this.todoList.innerHTML = '<div class="empty-state"><p>No tasks to show</p></div>';
            return;
        }
        
        filteredTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            
            li.innerHTML = `
                <input 
                    type="checkbox" 
                    class="checkbox" 
                    ${todo.completed ? 'checked' : ''}
                    data-id="${todo.id}"
                >
                <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                <button class="delete-btn" data-id="${todo.id}">Delete</button>
            `;
            
            // Checkbox listener
            li.querySelector('.checkbox').addEventListener('change', (e) => {
                this.toggleComplete(parseInt(e.target.dataset.id));
            });
            
            // Delete button listener
            li.querySelector('.delete-btn').addEventListener('click', (e) => {
                this.deleteTodo(parseInt(e.target.dataset.id));
            });
            
            this.todoList.appendChild(li);
        });
    }
    
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.todos));
        } catch (error) {
            console.error('Error saving to local storage:', error);
            alert('Failed to save tasks. Local storage might be full.');
        }
    }
    
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            this.todos = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading from local storage:', error);
            this.todos = [];
        }
    }
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});