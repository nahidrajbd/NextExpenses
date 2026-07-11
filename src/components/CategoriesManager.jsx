import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { AuthContext, ToastContext } from '../App';
import { Tags, Plus, Edit, Check, X, CheckSquare, Square } from 'lucide-react';

export default function CategoriesManager() {
  const { currentUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingActive, setEditingActive] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await db.getCategories();
      setCategories(cats);
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast('Category name cannot be empty.', 'error');
      return;
    }

    const nameExists = categories.some(
      c => c.name.toLowerCase() === newCatName.trim().toLowerCase()
    );
    if (nameExists) {
      showToast('Category already exists.', 'error');
      return;
    }

    try {
      await db.addCategory(newCatName);
      await db.addLog(currentUser.id, 'Create Category', `Created expense category: "${newCatName.trim()}"`);
      showToast('Category added successfully!', 'success');
      setNewCatName('');
      await loadCategories();
    } catch (err) {
      showToast('Failed to add category.', 'error');
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingActive(cat.active);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingName.trim()) {
      showToast('Category name cannot be empty.', 'error');
      return;
    }

    const nameExists = categories.some(
      c => c.id !== editingId && c.name.toLowerCase() === editingName.trim().toLowerCase()
    );
    if (nameExists) {
      showToast('Another category with this name already exists.', 'error');
      return;
    }

    try {
      await db.updateCategory(editingId, editingName, editingActive);
      await db.addLog(
        currentUser.id,
        'Update Category',
        `Updated category ID ${editingId} name to "${editingName.trim()}" (Status: ${editingActive ? 'Active' : 'Inactive'})`
      );

      showToast('Category updated successfully!', 'success');
      setEditingId(null);
      await loadCategories();
    } catch (err) {
      showToast('Failed to update category.', 'error');
    }
  };

  const handleToggleActive = async (cat) => {
    const nextState = !cat.active;
    try {
      await db.updateCategory(cat.id, cat.name, nextState);
      await db.addLog(
        currentUser.id,
        'Toggle Category Status',
        `${nextState ? 'Activated' : 'Deactivated'} category "${cat.name}"`
      );
      showToast(`Category ${nextState ? 'enabled' : 'disabled'}.`, 'info');
      await loadCategories();
    } catch (err) {
      showToast('Failed to update category status.', 'error');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>Categories Manager</h2>
          <p>Create and edit office expense categories for submission logs.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Categories List */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tags size={20} color="var(--primary)" />
            <span>Active Categories</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {categories.map(cat => (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: cat.active ? 'transparent' : 'var(--bg-primary)',
                  opacity: cat.active ? 1 : 0.6
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{cat.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Status: {cat.active ? 'Active' : 'Disabled'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => startEdit(cat)}
                    className="btn btn-icon"
                    title="Edit Category Name"
                  >
                    <Edit size={16} color="var(--primary)" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(cat)}
                    className="btn btn-icon"
                    title={cat.active ? 'Deactivate' : 'Activate'}
                  >
                    {cat.active ? (
                      <CheckSquare size={16} color="var(--success)" />
                    ) : (
                      <Square size={16} color="var(--text-muted)" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add/Edit panel card */}
        <div className="glass-card">
          {editingId ? (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Edit Category</h3>
              <form onSubmit={handleSaveEdit}>
                <div className="form-group">
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                  <input
                    type="checkbox"
                    id="edit-active-toggle"
                    checked={editingActive}
                    onChange={(e) => setEditingActive(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="edit-active-toggle" style={{ fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                    Active (allow submissions under this category)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem' }}>
                  <button type="button" onClick={cancelEdit} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Add New Category</h3>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Courier, Legal Fees"
                    className="form-control"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
                  <Plus size={18} />
                  <span>Create Category</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
