import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Avatar,
  Stack,
  Alert,
  Snackbar,
  CircularProgress,
  useTheme,
  Switch,
  FormControlLabel,
  Chip,
  alpha,
  Container,
  Paper,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Business as BuildingIcon,
  Room as RoomIcon,
} from '@mui/icons-material';
import { useTimetableContext } from '../../../contexts/TimetableContext';
import timetableService from '../../../services/timetableService';
import type { Room } from '../../../services/timetableService';

const RoomsTab: React.FC = () => {
  const theme = useTheme();
  const { formData, updateFormData } = useTimetableContext();
  const selectedRooms: Room[] = (formData.rooms || []) as Room[];

  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedImportRoom, setSelectedImportRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const [newRoom, setNewRoom] = useState({
    name: '',
    room_type: '',
    building: '',
    floor: 0,
    capacity: 0,
    has_projector: false,
    has_ac: false,
    has_wifi: false,
    is_accessible: false,
    is_lab: false,
    facilities: [] as string[],
    location_notes: '',
    is_active: true
  });

  const roomTypes = [
    'Classroom',
    'Computer Lab',
    'Physics Lab',
    'Chemistry Lab',
    'Auditorium',
    'Seminar Hall',
    'Conference Room'
  ];

  const buildings = [
    'Main Academic Block',
    'Science Block',
    'Engineering Block',
    'Library Block'
  ];

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await timetableService.getRooms();
      setAvailableRooms(response);
    } catch (err) {
      setError('Failed to load rooms');
      console.error('Error loading rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportRoom = () => {
    if (!selectedImportRoom) {
      setError('Please select a room to import');
      return;
    }

    const exists = selectedRooms.some(room => room.id === selectedImportRoom.id);
    if (exists) {
      setError('This room is already selected');
      return;
    }

    updateFormData('rooms', [...selectedRooms, selectedImportRoom]);
    setSuccess(`Imported room ${selectedImportRoom.name}`);
    setSelectedImportRoom(null);
  };

  const handleAddRoom = async () => {
    setLoading(true);
    try {
      const roomData = {
        name: newRoom.name,
        room_type: newRoom.room_type,
        building: newRoom.building,
        floor: newRoom.floor,
        capacity: newRoom.capacity,
        has_projector: newRoom.has_projector,
        has_ac: newRoom.has_ac,
        has_wifi: newRoom.has_wifi,
        is_accessible: newRoom.is_accessible,
        is_lab: newRoom.is_lab,
        facilities: newRoom.facilities,
        location_notes: newRoom.location_notes,
        is_active: newRoom.is_active
      };

      if (editingRoomId) {
        const updatedRoom = await timetableService.updateRoom(editingRoomId, roomData);
        setAvailableRooms(prev => prev.map(room => room.id === editingRoomId ? updatedRoom : room));
        updateFormData('rooms', selectedRooms.map(room => room.id === editingRoomId ? updatedRoom : room));
        setSuccess('Room updated successfully!');
      } else {
        const createdRoom = await timetableService.createRoom(roomData);
        setAvailableRooms(prev => [...prev, createdRoom]);
        updateFormData('rooms', [...selectedRooms, createdRoom]);
        setSuccess('Room added successfully!');
      }
      
      resetForm();
    } catch (err) {
      setError(editingRoomId ? 'Failed to update room' : 'Failed to add room');
      console.error('Error saving room:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRoom = (roomId: string) => {
    const roomToEdit = availableRooms.find(room => room.id === roomId);
    if (roomToEdit) {
      setEditingRoomId(roomId);
      setNewRoom({
        name: roomToEdit.name,
        room_type: roomToEdit.room_type,
        building: roomToEdit.building,
        floor: roomToEdit.floor,
        capacity: roomToEdit.capacity,
        has_projector: roomToEdit.has_projector,
        has_ac: roomToEdit.has_ac,
        has_wifi: roomToEdit.has_wifi,
        is_accessible: roomToEdit.is_accessible,
        is_lab: roomToEdit.is_lab,
        facilities: roomToEdit.facilities || [],
        location_notes: roomToEdit.location_notes || '',
        is_active: roomToEdit.is_active
      });
    }
  };

  const resetForm = () => {
    setNewRoom({
      name: '',
      room_type: '',
      building: '',
      floor: 0,
      capacity: 0,
      has_projector: false,
      has_ac: false,
      has_wifi: false,
      is_accessible: false,
      is_lab: false,
      facilities: [] as string[],
      location_notes: '',
      is_active: true
    });
    setEditingRoomId(null);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
      await timetableService.deleteRoom(roomId);
      setSuccess('Room deleted successfully!');
      updateFormData('rooms', selectedRooms.filter(room => room.id !== roomId));
      await loadRooms();
    } catch (err) {
      setError('Failed to delete room');
      console.error('Error deleting room:', err);
    }
  };

  if (loading && availableRooms.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: 'white',
          p: 4,
          borderRadius: 3,
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: 'white', color: 'primary.main', width: 48, height: 48 }}>
              <BuildingIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '2rem' }}>
                Infrastructure Management
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.1rem' }}>
                Manage rooms, labs, and facilities for optimal timetable scheduling
              </Typography>
            </Box>
          </Stack>

          <Card elevation={2} sx={{ p: 2, mb: 3, borderRadius: 3, backgroundColor: alpha(theme.palette.common.white, 0.15) }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Autocomplete
                fullWidth
                options={availableRooms}
                getOptionLabel={(room) => `${room.name} • ${room.building}`}
                value={selectedImportRoom}
                onChange={(_, newValue) => setSelectedImportRoom(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Import available room"
                    placeholder="Select a room to add"
                    variant="outlined"
                  />
                )}
              />
              <Button
                variant="contained"
                color="secondary"
                disabled={!selectedImportRoom}
                onClick={handleImportRoom}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Import Room
              </Button>
            </Stack>
          </Card>
          
          {/* Stats Cards */}
          <Box sx={{ display: 'flex', gap: 4, mt: 3, flexWrap: 'wrap' }}>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {availableRooms.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Total Rooms
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {availableRooms.reduce((sum, room) => sum + room.capacity, 0)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Total Capacity
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {availableRooms.filter(room => room.is_lab).length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Laboratory Rooms
              </Typography>
            </Box>
          </Box>
        </Box>
        
        {/* Background Pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: alpha('#ffffff', 0.1),
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: alpha('#ffffff', 0.05),
            zIndex: 0,
          }}
        />
      </Paper>

      {/* Add New Room Section */}
      <Card elevation={3} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ 
          background: `linear-gradient(90deg, ${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.info.main, 0.1)})`,
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40 }}>
              <RoomIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {editingRoomId ? 'Edit Room' : 'Add New Room'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {editingRoomId ? 'Update the selected room details' : 'Create a new room or infrastructure facility'}
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        <CardContent sx={{ p: 4 }}>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <TextField
                  fullWidth
                  label="Room Name/Number"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="e.g., A-101, Lab-205"
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                  }}
                />
              </Box>
              
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <FormControl fullWidth>
                  <InputLabel>Room Type</InputLabel>
                  <Select
                    value={newRoom.room_type}
                    label="Room Type"
                    onChange={(e) => setNewRoom({ ...newRoom, room_type: e.target.value })}
                    sx={{
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      },
                    }}
                  >
                    {roomTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <FormControl fullWidth>
                  <InputLabel>Building</InputLabel>
                  <Select
                    value={newRoom.building}
                    label="Building"
                    onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                    sx={{
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      },
                    }}
                  >
                    {buildings.map((building) => (
                      <MenuItem key={building} value={building}>
                        {building}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Floor"
                  type="number"
                  value={newRoom.floor}
                  onChange={(e) => setNewRoom({ ...newRoom, floor: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 0, 1, 2"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                  }}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Capacity"
                  type="number"
                  value={newRoom.capacity}
                  onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 0 })}
                  placeholder="Student capacity"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                  }}
                />
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: theme.palette.text.primary }}>
                Facilities & Equipment
              </Typography>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 3,
                  p: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={newRoom.has_projector}
                      onChange={(e) => setNewRoom({ ...newRoom, has_projector: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: theme.palette.primary.main,
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: theme.palette.primary.main,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                      Projector
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newRoom.has_ac}
                      onChange={(e) => setNewRoom({ ...newRoom, has_ac: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: theme.palette.primary.main,
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: theme.palette.primary.main,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                      Air Conditioning
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newRoom.has_wifi}
                      onChange={(e) => setNewRoom({ ...newRoom, has_wifi: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: theme.palette.primary.main,
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: theme.palette.primary.main,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                      WiFi
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newRoom.is_accessible}
                      onChange={(e) => setNewRoom({ ...newRoom, is_accessible: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: theme.palette.success.main,
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: theme.palette.success.main,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                      Wheelchair Accessible
                    </Typography>
                  }
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
              {editingRoomId && (
                <Button
                  variant="outlined"
                  onClick={resetForm}
                  sx={{ 
                    borderRadius: 2,
                    px: 3,
                    py: 1.5,
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={editingRoomId ? <EditIcon /> : <AddIcon />}
                onClick={handleAddRoom}
                disabled={!newRoom.name || !newRoom.room_type || !newRoom.building}
                sx={{ 
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                  '&:hover': {
                    boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.5)}`,
                    transform: 'translateY(-1px)',
                  },
                  '&:disabled': {
                    background: theme.palette.grey[300],
                    color: theme.palette.grey[500],
                    boxShadow: 'none',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {editingRoomId ? 'Update Room' : 'Add Room'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Infrastructure Inventory Table */}
      <Card elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ 
          background: `linear-gradient(90deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.1)})`,
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Selected Rooms ({selectedRooms.length})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rooms imported into this timetable
              </Typography>
            </Box>
            
            {selectedRooms.length > 0 && (
              <Chip
                icon={<BuildingIcon />}
                label={`${selectedRooms.reduce((sum, room) => sum + room.capacity, 0)} Total Capacity`}
                color="info"
                variant="outlined"
                sx={{ borderRadius: 2 }}
              />
            )}
          </Stack>
        </Box>
        
        {selectedRooms.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <Avatar sx={{ mx: 'auto', mb: 2, width: 80, height: 80, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
              <RoomIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Avatar>
            <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
              No Rooms Selected Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Import rooms from the available list or create a new room first
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={resetForm}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 0.6,
                height: 38,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              }}
            >
              Create First Room
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Room Details</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Type & Category</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Capacity</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Facilities</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedRooms.map((room) => (
                  <TableRow
                    key={room.id}
                    sx={{
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                      },
                      '&:nth-of-type(even)': {
                        bgcolor: alpha(theme.palette.grey[500], 0.02),
                      }
                    }}
                  >
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                          {room.name.substring(0, 2).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {room.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {room.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Chip
                          label={room.room_type}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ borderRadius: 1, fontSize: '0.75rem', alignSelf: 'flex-start' }}
                        />
                        {room.is_lab && (
                          <Chip
                            label="Laboratory"
                            size="small"
                            color="secondary"
                            sx={{ borderRadius: 2, alignSelf: 'flex-start' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {room.building}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Floor {room.floor}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        label={`${room.capacity} students`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2, maxWidth: 200 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {room.has_projector && (
                          <Chip
                            label="Projector"
                            size="small"
                            variant="outlined"
                            color="success"
                            sx={{ borderRadius: 1, fontSize: '0.75rem' }}
                          />
                        )}
                        {room.has_ac && (
                          <Chip
                            label="AC"
                            size="small"
                            variant="outlined"
                            color="info"
                            sx={{ borderRadius: 1, fontSize: '0.75rem' }}
                          />
                        )}
                        {room.has_wifi && (
                          <Chip
                            label="WiFi"
                            size="small"
                            variant="outlined"
                            color="warning"
                            sx={{ borderRadius: 1, fontSize: '0.75rem' }}
                          />
                        )}
                        {room.is_accessible && (
                          <Chip
                            label="Wheelchair Accessible"
                            size="small"
                            variant="outlined"
                            color="secondary"
                            sx={{ borderRadius: 1, fontSize: '0.75rem', minWidth: 140, whiteSpace: 'normal' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2, textAlign: 'center' }}>
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton
                          size="small"
                          onClick={() => handleEditRoom(room.id)}
                          sx={{
                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                            color: 'warning.main',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.warning.main, 0.2),
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRoom(room.id)}
                          sx={{
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            color: 'error.main',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.error.main, 0.2),
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RoomsTab;
