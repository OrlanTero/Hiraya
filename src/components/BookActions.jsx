import React, { useState } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  LibraryBooks,
  ContentCopy,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
} from "@mui/icons-material";

const BookActions = ({
  book,
  onEdit,
  onDelete,
  onAddCopy,
  onAddMultipleCopies,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    handleClose();
    switch (action) {
      case "edit":
        onEdit && onEdit(book);
        break;
      case "delete":
        onDelete && onDelete(book);
        break;
      case "addCopy":
        onAddCopy && onAddCopy(book);
        break;
      case "addMultipleCopies":
        onAddMultipleCopies && onAddMultipleCopies(book);
        break;
      // Add other actions as needed
      default:
        break;
    }
  };

  return (
    <Box>
      <Tooltip title="Book Actions">
        <Button
          id="book-actions-button"
          aria-controls={open ? "book-actions-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          onClick={handleClick}
          variant="contained"
          color="primary"
          endIcon={<MoreVertIcon />}
        >
          Actions
        </Button>
      </Tooltip>
      <Menu
        id="book-actions-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "book-actions-button",
        }}
      >
        <MenuItem onClick={() => handleAction("edit")}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Book</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => handleAction("addCopy")}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add Single Copy</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleAction("addMultipleCopies")}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add Multiple Copies</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => handleAction("delete")}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Book</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default BookActions;
