import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  useAddStaffMutation,
  useDeleteStaffMutation,
  useGetAllStaffQuery,
  useToggleStaffActiveMutation,
  useUpdateStaffMutation,
  useApproveStaffMutation,
} from "@/services/staffService";

import {
  useGenerateStaffIdMutation,
  useGetAllStaffIdsQuery,
  useDeleteStaffIdMutation,
} from "@/services/userApi";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";

const positions = ["Waiter", "Cashier", "Barista", "Manager"];

interface Staff {
  _id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  isApproved: boolean;
}

interface StaffForm {
  name: string;
  email: string;
  role: string;
  password?: string;
}

interface StaffIdType {
  _id: string;
  id: string;
  role: string;
  isUsed: boolean;
  createdAt: string;
}

export default function StaffManagement() {
  const { data, refetch, isLoading } = useGetAllStaffQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const staffs = data?.staffs || [];

  // Staff ID hooks
  const { data: staffIdsData, refetch: refetchStaffIds } = useGetAllStaffIdsQuery();
  const [generateStaffId] = useGenerateStaffIdMutation();
  const [deleteStaffId] = useDeleteStaffIdMutation();

  const [addStaff] = useAddStaffMutation();
  const [updateStaff] = useUpdateStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();
  const [toggleStaffActive] = useToggleStaffActiveMutation();
  const [approveStaff] = useApproveStaffMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedRoleForId, setSelectedRoleForId] = useState<string>("waiter");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { register, reset, handleSubmit, setValue, watch } = useForm<StaffForm>();

  // Generate staff ID handler
  const handleGenerateStaffId = async () => {
    try {
      const result = await generateStaffId({ role: selectedRoleForId }).unwrap();
      toast.success(`Generated staff ID: ${result.staffId.id}`);
      refetchStaffIds();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to generate staff ID");
    }
  };

  // Copy staff ID to clipboard
  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy ID");
    }
  };

  // Delete staff ID handler
  const handleDeleteStaffId = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff ID?")) return;
    try {
      await deleteStaffId(id).unwrap();
      toast.success("Staff ID deleted successfully");
      refetchStaffIds();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete staff ID");
    }
  };

  const handleApproveStaff = async (id: string) => {
    try {
      await approveStaff(id).unwrap();
      toast.success("Staff approved successfully!");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to approve staff.");
    }
  };

  const handleAddStaff = handleSubmit(async (formData) => {
    try {
      await addStaff({ ...formData }).unwrap();
      toast.success("Staff added successfully!");
      setAddOpen(false);
      reset();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to add staff.");
    }
  });


  const handleEditStaff = handleSubmit(async (formData) => {
    if (!selectedStaff) return;
    try {
      await updateStaff({
        id: selectedStaff._id,
        data: {
          name: formData.name,
          email: formData.email,
          role: formData.role.toLowerCase(),
          password: formData.password || undefined,
        },
      }).unwrap();
      toast.success("Staff updated successfully!");
      setEditOpen(false);
      setSelectedStaff(null);
      reset();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update staff.");
    }
  });


  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff?")) return;
    try {
      await deleteStaff(id).unwrap();
      toast.success("Staff deleted successfully!");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete staff.");
    }
  };


  const toggleActive = async (staff: Staff) => {
    try {
      await toggleStaffActive({
        id: staff._id,
        isActive: !staff.active,
      }).unwrap();
      toast.success(
        `Staff ${staff.active ? "deactivated" : "activated"} successfully!`
      );
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to toggle status.");
    }
  };


  const openEditDialog = (staff: Staff) => {
    setSelectedStaff(staff);
    setValue("name", staff.name);
    setValue("email", staff.email);
    setValue("role", staff.role.charAt(0).toUpperCase() + staff.role.slice(1));
    setValue("password", "");
    setEditOpen(true);
  };

  // ✅ Table Columns for Staff
  const columns = useMemo<ColumnDef<Staff>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "role", header: "Position" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const isActive = row.original.active;
          const isApproved = row.original.isApproved;

          return (
            <div className="flex flex-col gap-1">
              <Badge
                variant="outline"
                className={`px-2 py-0.5 rounded-full text-[10px] w-fit ${isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                  }`}
              >
                {isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge
                variant="outline"
                className={`px-2 py-0.5 rounded-full text-[10px] w-fit ${isApproved
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800"
                  }`}
              >
                {isApproved ? "Approved" : "Pending Approval"}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const staff = row.original;
          if (staff.role === "admin") {
            return <div className="text-gray-500 italic text-xs">Super Admin</div>;
          }

          return (
            <div className="flex flex-wrap gap-2">
              {!staff.isApproved && (
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleApproveStaff(staff._id)}
                >
                  Approve
                </Button>
              )}
              <Button size="sm" onClick={() => openEditDialog(staff)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteStaff(staff._id)}
              >
                Delete
              </Button>
              <Button
                size="sm"
                variant={staff.active ? "secondary" : "default"}
                onClick={() => toggleActive(staff)}
              >
                {staff.active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  // ✅ Table Columns for Staff IDs
  const staffIdColumns = useMemo<ColumnDef<StaffIdType>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Staff ID",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <code className="text-lg font-bold text-deep-black bg-gray-100 px-2 py-1 rounded">
              {row.original.id}
            </code>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => handleCopyId(row.original.id)}
            >
              {copiedId === row.original.id ? "Copied!" : "Copy"}
            </Button>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge className={`${row.original.role === "waiter" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
            {row.original.role.charAt(0).toUpperCase() + row.original.role.slice(1)}
          </Badge>
        ),
      },
      {
        id: "isUsed",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={`${row.original.isUsed ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
            {row.original.isUsed ? "Used" : "Available"}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDeleteStaffId(row.original._id)}
          >
            Delete
          </Button>
        ),
      },
    ],
    [copiedId]
  );

  const table = useReactTable({
    data: staffs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const staffIdTable = useReactTable({
    data: staffIdsData?.staffIds || [],
    columns: staffIdColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      {/* Staff ID Generator Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">🔑 Staff ID Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role for New ID</label>
              <Select value={selectedRoleForId} onValueChange={setSelectedRoleForId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiter">Waiter</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateStaffId}>
              Generate Staff ID
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            {staffIdsData?.staffIds?.length ? (
              <Table>
                <TableHeader>
                  {staffIdTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {staffIdTable.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No staff IDs generated yet. Generate your first one above!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Staff Management Section */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold">👥 Staff Management</h2>
          <AlertDialog open={addOpen} onOpenChange={setAddOpen}>
            <AlertDialogTrigger asChild>
              <Button>Add Staff +</Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Add New Staff</AlertDialogTitle>
              </AlertDialogHeader>
              <form
                onSubmit={handleAddStaff}
                className="flex flex-col gap-3 mt-4"
              >
                <Input placeholder="Name" {...register("name")} required />
                <Input placeholder="Email" {...register("email")} required />
                <Input
                  placeholder="Password"
                  type="password"
                  {...register("password")}
                  required
                />
                <Select
                  onValueChange={(val) => setValue("role", val)}
                  defaultValue=""
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AlertDialogFooter className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Staff</Button>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </div>


        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-6 w-1/4" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No staff found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>


        <AlertDialog open={editOpen} onOpenChange={setEditOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Staff</AlertDialogTitle>
            </AlertDialogHeader>
            <form onSubmit={handleEditStaff} className="flex flex-col gap-3 mt-4">
              <Input placeholder="Name" {...register("name")} required />
              <Input placeholder="Email" {...register("email")} required />
              <Input
                placeholder="Password (optional)"
                type="password"
                {...register("password")}
              />
              <Select
                onValueChange={(val) => setValue("role", val)}
                defaultValue={selectedStaff?.role || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AlertDialogFooter className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update</Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
