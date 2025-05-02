import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Grid,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  CircularProgress,
  Divider,
  Paper,
  IconButton,
  Stack,
  Snackbar,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import BookIcon from '@mui/icons-material/Book';

/**
 * Component for returning multiple books at once
 */
const MultiBookReturn = ({ 
  open, 
  onClose, 
  memberId, 
  onSuccess, 
  currentUser 
}) => {
  const [returnableBooks, setReturnableBooks] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Fetch returnable books when dialog opens
  useEffect(() => {
    console.log(`MultiBookReturn component: open=${open}, memberId=${memberId}`);
    if (open && memberId) {
      console.log('Calling fetchReturnableBooks');
      fetchReturnableBooks();
    }
  }, [open, memberId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedBooks([]);
    }
  }, [open]);

  const fetchReturnableBooks = async () => {
    try {
      setLoading(true);
      console.log(`Fetching returnable books for member ID: ${memberId}`);
      
      // Use the correct API function available in the main app
      const allLoans = await window.api.getActiveLoans();
      console.log('API response for all active loans:', allLoans);
      
      // Filter loans for the specific member
      const memberLoans = allLoans.filter(loan => {
        // Ensure comparison works with both string and number types
        return loan.member_id === memberId || 
               loan.member_id === Number(memberId) || 
               Number(loan.member_id) === Number(memberId);
      });
      console.log(`Filtered ${memberLoans.length} loans for member ID ${memberId}`);
      
      if (!memberLoans || memberLoans.length === 0) {
        console.log('No returnable books found for this member');
        setReturnableBooks([]);
        setSelectedBooks([]);
        return;
      }
      
      // Map each book to include selected state and condition
      const mappedBooks = memberLoans.map(book => {
        if (!book.id) {
          console.warn('Book missing loan_id:', book);
        }
        
        return {
          ...book,
          loan_id: book.id, // Use the loan id as the unique identifier
          title: book.book_title || book.title,
          author: book.book_author || book.author,
          checkout_date: book.checkout_date || book.loan_date,
          selected: false,
          condition: 'Good',
          note: ''
        };
      });
      
      console.log(`Processed ${mappedBooks.length} returnable books`, mappedBooks);
      setReturnableBooks(mappedBooks);
      setSelectedBooks([]);
    } catch (error) {
      console.error('Error fetching returnable books:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch returnable books: ' + (error.message || 'Unknown error'),
        severity: 'error'
      });
      setReturnableBooks([]);
      setSelectedBooks([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle book selection
  const handleToggleBook = (loanId) => {
    console.log(`Toggling selection for book with loan ID: ${loanId}`);
    
    // Update the returnable books array with the toggled selection
    setReturnableBooks(prevBooks => {
      const updatedBooks = prevBooks.map(book => 
        book.loan_id === loanId 
          ? { ...book, selected: !book.selected } 
          : book
      );
      
      // Update the selected books array after state update
      const selectedBooks = updatedBooks.filter(book => book.selected);
      console.log(`Selected books after toggle: ${selectedBooks.length}`);
      setSelectedBooks(selectedBooks);
      
      return updatedBooks;
    });
  };

  // Update book condition
  const handleChangeCondition = (loanId, condition) => {
    console.log(`Changing condition for book with loan ID: ${loanId} to ${condition}`);
    
    setReturnableBooks(prevBooks => {
      const updatedBooks = prevBooks.map(book => 
        book.loan_id === loanId 
          ? { ...book, condition: condition } 
          : book
      );
      
      // Update the selected books array after state update
      const selectedBooks = updatedBooks.filter(book => book.selected);
      setSelectedBooks(selectedBooks);
      
      return updatedBooks;
    });
  };

  // Update book note
  const handleChangeNote = (loanId, note) => {
    setReturnableBooks(prevBooks => {
      const updatedBooks = prevBooks.map(book => 
        book.loan_id === loanId 
          ? { ...book, note: note } 
          : book
      );
      
      // Update the selected books array after state update
      const selectedBooks = updatedBooks.filter(book => book.selected);
      setSelectedBooks(selectedBooks);
      
      return updatedBooks;
    });
  };

  // Select all books
  const handleSelectAll = () => {
    const allSelected = returnableBooks.every(book => book.selected);
    console.log(`Select all clicked. Current state: ${allSelected ? 'all selected' : 'not all selected'}`);
    
    setReturnableBooks(prevBooks => {
      const updatedBooks = prevBooks.map(book => ({ 
        ...book, 
        selected: !allSelected 
      }));
      
      // Update the selected books array after state update
      const selectedBooks = updatedBooks.filter(book => book.selected);
      console.log(`Selected ${selectedBooks.length} books after select all`);
      setSelectedBooks(selectedBooks);
      
      return updatedBooks;
    });
  };

  // Handle the return of multiple books
  const handleReturnBooks = async () => {
    if (selectedBooks.length === 0) {
      console.log('No books selected for return');
      setSnackbar({
        open: true,
        message: 'Please select at least one book to return',
        severity: 'warning'
      });
      return;
    }

    try {
      setSubmitting(true);
      console.log(`Attempting to return ${selectedBooks.length} books for member ID: ${memberId}`);
      
      // Prepare data for the API
      const returnData = {
        returns: selectedBooks.map(book => ({
          loan_id: book.loan_id,
          returnCondition: book.condition || 'Good',
          note: book.note || ''
        }))
      };
      
      console.log('Formatted return data:', JSON.stringify(returnData));
      // Use the appropriate API for the main app
      const result = await window.api.returnBooks(returnData);
      console.log('API response for multiple book return:', result);
      
      if (result.success) {
        console.log(`Successfully returned ${selectedBooks.length} books`);
        setSnackbar({
          open: true,
          message: `Successfully returned ${selectedBooks.length} books`,
          severity: 'success'
        });
        
        // Call success callback with the result
        if (onSuccess) {
          console.log('Calling onSuccess callback with result');
          onSuccess(result);
        }
        
        // Close dialog
        onClose();
      } else {
        console.error('API returned error:', result);
        setSnackbar({
          open: true,
          message: result.message || 'Failed to return books',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Exception during return books operation:', error);
      setSnackbar({
        open: true,
        message: 'An error occurred while returning books: ' + (error.message || 'Unknown error'),
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      
      // Format date as "MMM DD, YYYY" (e.g., "Jan 01, 2023")
      const options = { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit' 
      };
      
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString || "N/A";
    }
  };

  // Add function for easy debug
  const logDebugInfo = () => {
    console.log('Debug Info - MultiBookReturn:');
    console.log('- Dialog open:', open);
    console.log('- Member ID:', memberId);
    console.log('- Current User:', currentUser);
    console.log('- Returnable Books:', returnableBooks.length);
    console.log('- Selected Books:', selectedBooks.length);
    console.log('- Loading State:', loading);
    console.log('- Submitting State:', submitting);
  };

  // Add a debug button to the dialog
  const DebugButton = () => (
    <Button 
      variant="outlined" 
      color="warning" 
      size="small"
      onClick={logDebugInfo}
      sx={{ mb: 2 }}
    >
      Log Debug Info
    </Button>
  );

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: 2
          }}
        >
          Return Multiple Books
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          {/* Add debug info at the top when in development */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mb: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" color="info.contrastText">
                Debug: Dialog open={String(open)}, MemberId={memberId}, 
                Books={returnableBooks.length}, Selected={selectedBooks.length}
              </Typography>
              <DebugButton />
            </Box>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : returnableBooks.length === 0 ? (
            <Typography variant="body1" align="center" sx={{ p: 3 }}>
              No books available to return
            </Typography>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  {returnableBooks.length} Books Available to Return
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={handleSelectAll}
                >
                  {returnableBooks.every(book => book.selected) 
                    ? 'Deselect All' 
                    : 'Select All'}
                </Button>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select the books you want to return and specify their condition.
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected: {selectedBooks.length} of {returnableBooks.length} books
                </Typography>
              </Box>
              
              {returnableBooks.map((book) => (
                <Paper 
                  key={book.loan_id} 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    mb: 2, 
                    border: book.selected ? '2px solid #1976d2' : 'none',
                    bgcolor: book.selected ? 'rgba(25, 118, 210, 0.04)' : 'inherit'
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={7}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={book.selected} 
                              onChange={() => handleToggleBook(book.loan_id)}
                            />
                          }
                          label=""
                        />
                        <Box>
                          <Typography variant="subtitle1" component="div">
                            {book.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            by {book.author}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Borrowed: {formatDate(book.checkout_date)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Due: {formatDate(book.due_date)}
                          </Typography>
                          {new Date(book.due_date) < new Date() && (
                            <Typography variant="body2" color="error">
                              Overdue
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={5}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                          <InputLabel id={`condition-label-${book.loan_id}`}>Condition</InputLabel>
                          <Select
                            labelId={`condition-label-${book.loan_id}`}
                            value={book.condition}
                            label="Condition"
                            onChange={(e) => handleChangeCondition(book.loan_id, e.target.value)}
                            disabled={!book.selected}
                          >
                            <MenuItem value="Good">Good</MenuItem>
                            <MenuItem value="Damaged">Damaged</MenuItem>
                            <MenuItem value="Lost">Lost</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <TextField
                          size="small"
                          label="Note (optional)"
                          value={book.note}
                          onChange={(e) => handleChangeNote(book.loan_id, e.target.value)}
                          disabled={!book.selected}
                          placeholder="Add any comments about this book..."
                          multiline
                          rows={2}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {selectedBooks.length} books selected
          </Typography>
          <Box>
            <Button onClick={onClose} sx={{ mr: 1 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={submitting ? <CircularProgress size={20} /> : <CheckIcon />}
              onClick={handleReturnBooks}
              disabled={selectedBooks.length === 0 || submitting}
            >
              {submitting ? 'Processing...' : 'Return Selected Books'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default MultiBookReturn; 