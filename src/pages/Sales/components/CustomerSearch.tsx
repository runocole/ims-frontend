// src/pages/Sales/components/CustomerSearch.tsx
import { useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import type { Customer } from "../types";

interface CustomerSearchProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onAddSaleClick: () => void;
  selectedCustomer: Customer | null;
  onClearCustomer: () => void;
}

const CustomerSearch = ({ 
  customers, 
  onSelectCustomer, 
  onAddSaleClick,
  selectedCustomer,
  onClearCustomer
}: CustomerSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === "") {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(query.toLowerCase()) ||
      customer.phone.includes(query) ||
      customer.email.toLowerCase().includes(query.toLowerCase()) ||
      customer.state.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <Card className="bg-blue-950 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Find Customer for New Sale</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search customers by name, phone, email, or state..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10 text-white bg-slate-800 border-slate-600 focus:border-blue-500 placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              onClick={onAddSaleClick}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sale Manually
            </Button>
          </div>

          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-600 rounded-md shadow-lg z-10 mt-1 max-h-60 overflow-y-auto">
              {searchResults.map((customer) => (
                <div
                  key={customer.id}
                  className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-600 last:border-b-0 transition-colors"
                  onClick={() => handleSelectCustomer(customer)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-white">{customer.name}</p>
                      <p className="text-sm text-gray-300">{customer.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">{customer.email}</p>
                      <p className="text-sm text-gray-300">{customer.state}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showSearchResults && searchQuery && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-600 rounded-md shadow-lg z-10 mt-1 p-4">
              <p className="text-gray-300 text-center">No customers found matching your search.</p>
            </div>
          )}
        </div>

        {selectedCustomer && (
          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-md">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-blue-300">Selected Customer</h3>
                <p className="text-sm text-gray-300">
                  {selectedCustomer.name} • {selectedCustomer.phone} • {selectedCustomer.email} • {selectedCustomer.state}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearCustomer}
                className="text-red-400 border-red-600 hover:bg-red-900/30 hover:text-red-300"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { CustomerSearch };