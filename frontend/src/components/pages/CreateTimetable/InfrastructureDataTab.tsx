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
  Autocomplete,
  Chip,
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
  alpha,
  useTheme,
  Switch,
  FormControlLabel,
  Tooltip,
  FormGroup,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Room as RoomIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Business as BuildingIcon,
  MeetingRoom as MeetingRoomIcon,
  Computer as LabIcon,
  Accessible as AccessibleIcon,
  Videocam as ProjectorIcon,
  AcUnit as AcIcon,
  Wifi as WifiIcon,
} from '@mui/icons-material';
import { useTimetableContext } from '../../../contexts/TimetableContext';
import timetableService from '../../../services/timetableService';
import type { Room } from '../../../services/timetableService';

interface InfrastructureDataTabProps {}

const InfrastructureDataTab: React.FC<InfrastructureDataTabProps> = () => {
  const theme = useTheme();
  const { formData, updateFormData } = useTimetableContext();
  
  const selectedRooms: Room[] = (formData.rooms || []) as Room[];

  // State management
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedImportRoom, setSelectedImportRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Room>>({});

  // New room form state
  const [newRoom, setNewRoom] = useState({
    name: '',
    building: '',
    floor: 0,
    capacity: 30,
    room_type: 'Classroom',
    facilities: [] as string[],
    is_lab: false,
    is_accessible: true,
    has_projector: false,
    has_ac: false,
    has_wifi: true,
    location_notes: '',
    is_active: true,
  });

  // Options for form fields
  const roomTypeOptions = ['Classroom', 'Laboratory', 'Auditorium', 'Seminar Hall', 'Conference Room', 'Library', 'Computer Lab', 'Physics Lab', 'Chemistry Lab', 'Biology Lab', 'Workshop'];
  const facilityOptions = ['Projector', 'Smart Board', 'Whiteboard', 'Air Conditioning', 'WiFi', 'Audio System', 'Microphone', 'Computer', 'Printer', 'Scanner', 'CCTV', 'Fire Safety'];

  // Load rooms data
  const loadRooms = async () => {
    try {
      setLoading(true);
      const fetchedRooms = await timetableService.getRooms();
      setAvailableRooms(fetchedRooms);
      console.log('✅ Rooms loaded successfully:', fetchedRooms.length);
    } catch (err: any) {
      console.error('❌ Failed to load rooms:', err);
      setError('Failed to load rooms: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Load rooms when component mounts
  useEffect(() => {
    loadRooms();
  }, []);

  const handleAddRoom = async () => {
    if (!newRoom.name.trim() || !newRoom.building.trim()) {
      setError('Room name and building are required');
      return;
    }

    setLoading(true);
    try {
      const createdRoom = await timetableService.createRoom(newRoom);
      setAvailableRooms(prevRooms => [...prevRooms, createdRoom]);

      // Reset form
      setNewRoom({
        name: '',
        building: '',
        floor: 0,
        capacity: 30,
        room_type: 'Classroom',
        facilities: [],
        is_lab: false,
        is_accessible: true,
        has_projector: false,
        has_ac: false,
        has_wifi: true,
        location_notes: '',
        is_active: true,
      });

      setSuccess('Room added successfully');
    } catch (err: any) {
      setError('Failed to add room: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setEditFormData({
      name: room.name,
      building: room.building,
      floor: room.floor,
      capacity: room.capacity,
      room_type: room.room_type,
      facilities: room.facilities,
      is_lab: room.is_lab,
      is_accessible: room.is_accessible,
      has_projector: room.has_projector,
      has_ac: room.has_ac,
      has_wifi: room.has_wifi,
      location_notes: room.location_notes,
      is_active: room.is_active,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRoom || !editFormData.name?.trim() || !editFormData.building?.trim()) {
      setError('Room name and building are required');
      return;
    }

    setLoading(true);
    try {
      const updatedRoom = await timetableService.updateRoom(editingRoom.id, editFormData);
      setAvailableRooms(prevRooms => prevRooms.map(room => 
        room.id === editingRoom.id ? updatedRoom : room
      ));
      updateFormData('rooms', selectedRooms.map(room => 
        room.id === editingRoom.id ? updatedRoom : room
      ));

      setEditingRoom(null);
      setEditFormData({});
      setSuccess('Room updated successfully');
    } catch (err: any) {
      setError('Failed to update room: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRoom(null);
    setEditFormData({});
  };

  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this room?')) {
      return;
    }

    setLoading(true);
    try {
      await timetableService.deleteRoom(id);
      const updatedRooms = availableRooms.filter(room => room.id !== id);
      setAvailableRooms(updatedRooms);
      updateFormData('rooms', selectedRooms.filter(room => room.id !== id));
      setSuccess('Room deleted successfully');
    } catch (err: any) {
      setError('Failed to delete room: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getRoomIcon = (roomType: string) => {
    switch (roomType.toLowerCase()) {
      case 'laboratory':
      case 'computer lab':
      case 'physics lab':
      case 'chemistry lab':
      case 'biology lab':
        return <LabIcon />;
      case 'auditorium':
      case 'seminar hall':
        return <MeetingRoomIcon />;
      default:
        return <RoomIcon />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper
        sx={{
          mb: 4,
          p: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '200px',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)}, transparent)`,
            borderRadius: '50%',
            transform: 'translate(50%, -50%)',
          }}
        />
        <Stack direction="row" alignItems="center" spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60 }}>
            <BuildingIcon sx={{ fontSize: 30 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Infrastructure Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage classrooms, laboratories, and facilities for optimal space utilization
            </Typography>
          </Box>
        </Stack>
        <Box
          sx={{
            position: 'absolute',
            bottom: -10,
            left: -10,
            width: '100px',
            height: '100px',
            background: alpha('#ffffff', 0.05),
            zIndex: 0,
          }}
        />
      </Paper>

      <Card elevation={3} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Import Available Room
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Autocomplete
              fullWidth
              options={availableRooms}
              getOptionLabel={(room) => `${room.name} - ${room.building}`}
              value={selectedImportRoom}
              onChange={(_, newValue) => setSelectedImportRoom(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select room to import"
                  placeholder="Choose a room"
                />
              )}
            />
            <Button
              variant="contained"
              disabled={!selectedImportRoom}
              onClick={() => {
                if (!selectedImportRoom) {
                  setError('Please select a room to import');
                  return;
                }
                const exists = selectedRooms.some((room) => room.id === selectedImportRoom.id);
                if (exists) {
                  setError('This room is already selected');
                  return;
                }
                updateFormData('rooms', [...selectedRooms, selectedImportRoom]);
                setSuccess(`Imported room ${selectedImportRoom.name}`);
                setSelectedImportRoom(null);
              }}
            >
              Import Room
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Add New Room Section */}
      <Card elevation={3} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ 
          background: `linear-gradient(90deg, ${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.info.main, 0.1)})`,
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40 }}>
              <AddIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Add New Room
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create new rooms and facilities for your institution
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Row 1: Room Name and Building */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <TextField
                  fullWidth
                  label="Room Name/Number"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="e.g., A-101, Lab-3, Auditorium-1"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  fullWidth
                  label="Building"
                  value={newRoom.building}
                  onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                  placeholder="e.g., Main Building, Science Block"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            </Box>
            
            {/* Row 2: Floor, Capacity, and Room Type */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <TextField
                  fullWidth
                  label="Floor"
                  type="number"
                  value={newRoom.floor}
                  onChange={(e) => setNewRoom({ ...newRoom, floor: Number(e.target.value) })}
                  inputProps={{ min: 0, max: 20 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <TextField
                  fullWidth
                  label="Capacity"
                  type="number"
                  value={newRoom.capacity}
                  onChange={(e) => setNewRoom({ ...newRoom, capacity: Number(e.target.value) })}
                  inputProps={{ min: 1, max: 500 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
              <Box sx={{ flex: 2, minWidth: 200 }}>
                <FormControl fullWidth>
                  <InputLabel>Room Type</InputLabel>
                  <Select
                    value={newRoom.room_type}
                    label="Room Type"
                    onChange={(e) => setNewRoom({ ...newRoom, room_type: e.target.value })}
                    sx={{ borderRadius: 2 }}
                  >
                    {roomTypeOptions.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
            
            {/* Row 3: Facilities */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 400 }}>
                <Autocomplete
                  multiple
                  options={facilityOptions}
                  value={newRoom.facilities}
                  onChange={(_, newValue) => setNewRoom({ ...newRoom, facilities: newValue })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Facilities"
                      placeholder="Select available facilities"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        size="small"
                        color="primary"
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                />
              </Box>
            </Box>
            
            {/* Row 4: Checkboxes and Add Button */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormGroup row sx={{ flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newRoom.is_lab}
                      onChange={(e) => setNewRoom({ ...newRoom, is_lab: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Laboratory"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newRoom.is_accessible}
                      onChange={(e) => setNewRoom({ ...newRoom, is_accessible: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Accessible"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newRoom.has_projector}
                      onChange={(e) => setNewRoom({ ...newRoom, has_projector: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Projector"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newRoom.has_ac}
                      onChange={(e) => setNewRoom({ ...newRoom, has_ac: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="AC"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newRoom.has_wifi}
                      onChange={(e) => setNewRoom({ ...newRoom, has_wifi: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="WiFi"
                />
              </FormGroup>
              <Box sx={{ flexShrink: 0 }}>
                <Button
                  variant="contained"
                  onClick={handleAddRoom}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 0.6,
                    height: 38,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    }
                  }}
                >
                  {loading ? 'Adding...' : 'Add Room'}
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Rooms Table */}
      <Card elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ 
          background: `linear-gradient(90deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.1)})`,
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Rooms & Facilities ({selectedRooms.length})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage your institution's infrastructure and facilities
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
              No Rooms Added Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start by adding rooms and facilities using the form above
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Room</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Building</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Capacity</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Features</TableCell>
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
                    {editingRoom?.id === room.id ? (
                      // Edit mode - render input fields
                      <>
                        <TableCell>
                          <TextField
                            size="small"
                            value={editFormData.name || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            placeholder="Room name"
                          />
                          <Typography variant="caption" display="block" color="text.secondary">
                            Floor: {editFormData.floor || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={editFormData.building || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, building: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={editFormData.room_type || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, room_type: e.target.value })}
                            >
                              {roomTypeOptions.map((type) => (
                                <MenuItem key={type} value={type}>
                                  {type}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={editFormData.capacity || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, capacity: Number(e.target.value) })}
                            inputProps={{ min: 1, max: 500 }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                  checked={editFormData.has_projector || false}
                                  onChange={(e) => setEditFormData({ ...editFormData, has_projector: e.target.checked })}
                                />
                              }
                              label="Proj"
                              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                  checked={editFormData.has_ac || false}
                                  onChange={(e) => setEditFormData({ ...editFormData, has_ac: e.target.checked })}
                                />
                              }
                              label="AC"
                              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Autocomplete
                            multiple
                            size="small"
                            options={facilityOptions}
                            value={editFormData.facilities || []}
                            onChange={(_, newValue) => setEditFormData({ ...editFormData, facilities: newValue })}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                placeholder="Facilities"
                              />
                            )}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  variant="outlined"
                                  label={option}
                                  size="small"
                                  {...getTagProps({ index })}
                                  key={option}
                                />
                              ))
                            }
                            sx={{ minWidth: 200 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              size="small"
                              onClick={handleSaveEdit}
                              color="success"
                              disabled={loading}
                            >
                              <SaveIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={handleCancelEdit}
                              color="error"
                            >
                              <CancelIcon />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </>
                    ) : (
                      // Display mode
                      <>
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getRoomIcon(room.room_type)}
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {room.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Floor {room.floor}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>{room.building}</TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={room.room_type}
                            size="small"
                            variant="outlined"
                            color={room.is_lab ? 'secondary' : 'default'}
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {room.capacity}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Stack direction="row" spacing={0.5}>
                            {room.is_accessible && (
                              <Tooltip title="Wheelchair Accessible">
                                <AccessibleIcon fontSize="small" color="primary" />
                              </Tooltip>
                            )}
                            {room.has_projector && (
                              <Tooltip title="Projector Available">
                                <ProjectorIcon fontSize="small" color="secondary" />
                              </Tooltip>
                            )}
                            {room.has_ac && (
                              <Tooltip title="Air Conditioned">
                                <AcIcon fontSize="small" color="info" />
                              </Tooltip>
                            )}
                            {room.has_wifi && (
                              <Tooltip title="WiFi Available">
                                <WifiIcon fontSize="small" color="success" />
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {(room.facilities || []).slice(0, 3).map((facility) => (
                              <Chip
                                key={facility}
                                label={facility}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ fontSize: '0.7rem', borderRadius: 2 }}
                              />
                            ))}
                            {(room.facilities || []).length > 3 && (
                              <Chip
                                label={`+${room.facilities.length - 3}`}
                                size="small"
                                variant="outlined"
                                color="default"
                                sx={{ fontSize: '0.7rem', borderRadius: 2 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2, textAlign: 'center' }}>
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton
                              size="small"
                              onClick={() => handleEditRoom(room)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteRoom(room.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Snackbars for notifications */}
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
    </Box>
  );
};

export default InfrastructureDataTab;
